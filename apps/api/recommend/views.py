"""Crop recommendation API: the Panda Smart recommender, merged into Ukulima Bora."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsStaffUser
from recommend import engine
from recommend.crops import CROP_SLUGS, FEATURE_LABELS, FEATURE_UNITS, crop_meta
from recommend.models import CropRecommendation
from recommend.serializers import RecommendInputSerializer
from recommend.weather import recommendation_weather


def _features() -> list[dict]:
    return [
        {"key": f, "label": FEATURE_LABELS[f], "unit": FEATURE_UNITS[f]}
        for f in engine.FEATURES
    ]


def _crop_result(slug: str, confidence: float, values: dict[str, float]) -> dict:
    return {
        **crop_meta(slug),
        "confidence": round(confidence, 4),
        "in_range": engine.in_range_count(values, slug),
    }


def _record_payload(record: CropRecommendation) -> dict:
    values = record.inputs()
    top = crop_meta(record.top_crop) or {"slug": record.top_crop, "name": record.top_crop}
    return {
        "id": record.id,
        "created_at": record.created_at,
        "location": record.location,
        "inputs": values,
        "top": {**top, "confidence": round(record.confidence, 4)},
        "results": [
            _crop_result(item["crop"], item["confidence"], values)
            for item in record.results
            if crop_meta(item.get("crop", ""))
        ],
    }


class CropRecommendView(APIView):
    """POST soil + climate values, get the three best-suited crops.

    Open to everyone (the public crop advisor page); signed-in users also get
    the run saved to their history.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "recommend"

    def post(self, request):
        serializer = RecommendInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        values = {f: data[f] for f in engine.FEATURES}

        ranked = engine.rank_crops(values, top=3)
        top_slug, top_confidence = ranked[0]
        results = [_crop_result(slug, p, values) for slug, p in ranked]

        record = None
        if request.user and request.user.is_authenticated:
            record = CropRecommendation.objects.create(
                user=request.user,
                nitrogen=values["N"],
                phosphorus=values["P"],
                potassium=values["K"],
                temperature=values["temperature"],
                humidity=values["humidity"],
                ph=values["ph"],
                rainfall=values["rainfall"],
                location=data.get("location", ""),
                top_crop=top_slug,
                confidence=top_confidence,
                results=[{"crop": s, "confidence": round(p, 4)} for s, p in ranked],
            )

        return Response(
            {
                "id": record.id if record else None,
                "saved": record is not None,
                "inputs": values,
                "top": results[0],
                "results": results,
                "fit": engine.fit_report(values, top_slug),
                "warnings": engine.out_of_range(values),
                "model": engine.model_info(),
            }
        )


class CropRecommendationHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = CropRecommendation.objects.filter(user=request.user)[:20]
        return Response({"results": [_record_payload(r) for r in records]})


class CropRecommendationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, record_id: int):
        deleted, _ = CropRecommendation.objects.filter(
            user=request.user, pk=record_id
        ).delete()
        if not deleted:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CropWeatherView(APIView):
    """Temperature, humidity and a 30-day rain estimate to pre-fill the advisor."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "weather"

    def get(self, request):
        location = (request.query_params.get("location") or "").strip()[:120]
        country = "Kenya"
        if not location:
            profile = getattr(request.user, "farmer_profile", None) or getattr(
                request.user, "buyer_profile", None
            )
            location = (getattr(profile, "county", "") or "").strip()
            country = (getattr(profile, "country", "") or "").strip() or "Kenya"
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")
        if lat and lon:
            try:
                weather = recommendation_weather(location, country, lat=float(lat), lon=float(lon))
            except (TypeError, ValueError):
                weather = recommendation_weather(location, country)
        elif location:
            weather = recommendation_weather(location, country)
        else:
            return Response(
                {"weather": None, "detail": "Enter a town or county to load weather."}
            )
        if weather is None:
            return Response(
                {"weather": None, "detail": f"Could not load weather for {location}."}
            )
        return Response({"weather": weather})


class CropCatalogView(APIView):
    """Public list of the 22 crops with the conditions each grew in."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "crops": [
                    {**crop_meta(slug), "stats": engine.crop_stats(slug)}
                    for slug in CROP_SLUGS
                ],
                "features": _features(),
                "model": engine.model_info(),
            }
        )


class CropCatalogDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug: str):
        meta = crop_meta(slug)
        if meta is None:
            return Response({"detail": "Unknown crop."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                "crop": {**meta, "stats": engine.crop_stats(slug)},
                "features": _features(),
                "model": engine.model_info(),
            }
        )


class AdminRecommendationStatsView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        records = CropRecommendation.objects.all()
        since = timezone.now() - timedelta(days=7)
        by_crop = (
            records.values("top_crop").annotate(count=Count("id")).order_by("-count")[:10]
        )
        recent = records.select_related("user")[:20]
        return Response(
            {
                "total": records.count(),
                "last_7_days": records.filter(created_at__gte=since).count(),
                "users": records.values("user").distinct().count(),
                "top_crops": [
                    {
                        **(crop_meta(row["top_crop"]) or {"slug": row["top_crop"], "name": row["top_crop"]}),
                        "count": row["count"],
                    }
                    for row in by_crop
                ],
                "recent": [
                    {
                        "id": r.id,
                        "username": r.user.get_username(),
                        "top_crop": (crop_meta(r.top_crop) or {}).get("name", r.top_crop),
                        "confidence": round(r.confidence, 4),
                        "location": r.location,
                        "created_at": r.created_at,
                    }
                    for r in recent
                ],
                "model": engine.model_info(),
            }
        )
