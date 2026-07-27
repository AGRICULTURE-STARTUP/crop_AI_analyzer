"""API views for offline KAMIS market price lookup and buyer/farmer directories."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import resolve_user_role
from main_app.kamis.query import search_prices
from main_app.models import BuyerProfile, FarmerProfile


class KamisMarketPricesView(APIView):
    """Look up recent KAMIS prices from the local SQLite cache.

    Query params:
      - crop (required): e.g. maize, tomatoes, wheat
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        crop = (request.query_params.get("crop") or "").strip()
        if not crop:
            return Response(
                {"detail": "Query parameter 'crop' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Crop-only lookup; market/county come back on each result row.
        payload = search_prices(crop=crop)
        if payload.get("detail") and payload.get("count") == 0 and "empty" in (
            payload.get("detail") or ""
        ):
            return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(payload)


class BuyersDirectoryView(APIView):
    """Verified buyers for farmers to discover and contact.

    Query params (optional):
      - county / location: filter by county
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = resolve_user_role(request.user)
        if role not in ("farmer", "buyer", "admin"):
            return Response(
                {"detail": "Buyers directory is available to farmers and buyers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = BuyerProfile.objects.select_related("user").all()
        location = (
            request.query_params.get("location")
            or request.query_params.get("county")
            or ""
        ).strip()
        if location:
            qs = qs.filter(county__icontains=location)

        buyer_list = []
        for buyer in qs.order_by("first_name", "id"):
            location_label = ", ".join(
                part for part in [buyer.county, buyer.country] if part
            )
            photo_url = None
            if buyer.photo:
                try:
                    photo_url = request.build_absolute_uri(buyer.photo.url)
                except Exception:
                    photo_url = buyer.photo.url
            buyer_list.append(
                {
                    "id": buyer.id,
                    "name": buyer.first_name or buyer.user.get_username(),
                    "first_name": buyer.first_name,
                    "email": buyer.email,
                    "phone_number": buyer.phone_number or "",
                    "contact": buyer.phone_number or buyer.email or "",
                    "county": buyer.county or "",
                    "country": buyer.country or "",
                    "location": location_label,
                    "photo": photo_url,
                    "verified": True,
                    "verification_badge": "Verified",
                }
            )
        return Response({"buyer_list": buyer_list, "count": len(buyer_list)})


class FarmersDirectoryView(APIView):
    """Registered farmers for buyers to discover and contact.

    Query params (optional):
      - crop / products: filter by products text
      - county / location: filter by county
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = resolve_user_role(request.user)
        if role not in ("buyer", "farmer", "admin"):
            return Response(
                {"detail": "Farmers directory is available to buyers and farmers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = FarmerProfile.objects.select_related("user").all()
        county_q = (
            request.query_params.get("county")
            or request.query_params.get("location")
            or ""
        ).strip()
        crop_q = (
            request.query_params.get("crop")
            or request.query_params.get("products")
            or ""
        ).strip()
        if county_q:
            qs = qs.filter(county__icontains=county_q)
        if crop_q:
            qs = qs.filter(products__icontains=crop_q)

        farmer_list = []
        for farmer in qs.order_by("user__first_name", "id"):
            photo_url = None
            if farmer.profile_photo:
                try:
                    photo_url = request.build_absolute_uri(farmer.profile_photo.url)
                except Exception:
                    photo_url = farmer.profile_photo.url
            name = " ".join(
                part
                for part in [farmer.user.first_name, farmer.user.last_name]
                if part
            ).strip() or farmer.user.username
            location_label = ", ".join(
                part for part in [farmer.county, farmer.country] if part
            )
            farmer_list.append(
                {
                    "id": farmer.id,
                    "username": farmer.user.username,
                    "name": name,
                    "phone_number": farmer.phone_number or "",
                    "county": farmer.county or "",
                    "country": farmer.country or "",
                    "location": location_label,
                    "products": farmer.products or "",
                    "farm_name": farmer.farm_name or "",
                    "farm_size_acres": (
                        str(farmer.farm_size_acres)
                        if farmer.farm_size_acres is not None
                        else ""
                    ),
                    "photo": photo_url,
                }
            )
        return Response({"farmer_list": farmer_list, "count": len(farmer_list)})
