"""DB-backed agro-input marketplace: agency catalogue + farmer discovery."""

from django.db.models import Count, Q
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.input_serializers import (
    AgencyProductPublicSerializer,
    AgencyProductWriteSerializer,
    AgencyPublicSerializer,
)
from accounts.models import AgencyProduct, AgencyProfile
from accounts.permissions import IsAgency, IsFarmer


class InputAgencyListView(APIView):
    """List registered input agencies (optional county / type / name filter)."""

    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        qs = AgencyProfile.objects.annotate(
            product_count=Count(
                "products",
                filter=Q(products__is_available=True, products__is_hidden=False),
            )
        ).order_by("agency_name")

        county = request.query_params.get("county", "")
        if county.strip():
            qs = qs.filter(county__icontains=county.strip())

        agency_type = request.query_params.get("type", "").strip().lower()
        if agency_type:
            qs = qs.filter(agency_type=agency_type)

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(agency_name__icontains=q)
                | Q(county__icontains=q)
                | Q(phone__icontains=q)
            )

        return Response(
            {"agencies": AgencyPublicSerializer(qs, many=True).data}
        )


class InputProductListView(APIView):
    """List products uploaded by registered agencies."""

    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        qs = (
            AgencyProduct.objects.filter(is_available=True, is_hidden=False)
            .select_related("agency")
            .order_by("-created_at")
        )

        county = request.query_params.get("county", "").strip()
        if county:
            qs = qs.filter(agency__county__icontains=county)

        category = request.query_params.get("category", "").strip().lower()
        if category:
            qs = qs.filter(category=category)

        agency_id = request.query_params.get("agency_id", "").strip()
        if agency_id.isdigit():
            qs = qs.filter(agency_id=int(agency_id))

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(description__icontains=q)
                | Q(agency__agency_name__icontains=q)
                | Q(agency__county__icontains=q)
            )

        return Response(
            {
                "products": AgencyProductPublicSerializer(
                    qs, many=True, context={"request": request}
                ).data
            }
        )


class MyAgencyProductListCreateView(APIView):
    """Agency owns: list + create catalogue items."""

    permission_classes = [IsAuthenticated, IsAgency]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        products = request.user.agency_profile.products.all()
        return Response(
            {
                "products": AgencyProductWriteSerializer(
                    products, many=True, context={"request": request}
                ).data
            }
        )

    def post(self, request):
        ser = AgencyProductWriteSerializer(
            data=request.data,
            context={"agency": request.user.agency_profile, "request": request},
        )
        ser.is_valid(raise_exception=True)
        product = ser.save()
        return Response(
            AgencyProductWriteSerializer(
                product, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class MyAgencyProductDetailView(APIView):
    """Agency owns: update or delete one product."""

    permission_classes = [IsAuthenticated, IsAgency]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_owned(self, request, product_id: int):
        try:
            return request.user.agency_profile.products.get(pk=product_id)
        except AgencyProduct.DoesNotExist:
            return None

    def patch(self, request, product_id: int):
        product = self._get_owned(request, product_id)
        if product is None:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        ser = AgencyProductWriteSerializer(
            product,
            data=request.data,
            partial=True,
            context={"agency": request.user.agency_profile, "request": request},
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, product_id: int):
        product = self._get_owned(request, product_id)
        if product is None:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _haversine_km(lat1, lon1, lat2, lon2):
    from math import asin, cos, radians, sin, sqrt

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(a))


class NearestAgencyListView(APIView):
    """Agencies ordered by distance from the farmer's lat/lon."""

    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        try:
            lat = float(request.query_params.get("lat", ""))
            lon = float(request.query_params.get("lon", ""))
        except (TypeError, ValueError):
            return Response(
                {"detail": "lat and lon query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agencies = list(
            AgencyProfile.objects.filter(latitude__isnull=False, longitude__isnull=False)
        )
        for a in agencies:
            a.distance_km = round(
                _haversine_km(lat, lon, float(a.latitude), float(a.longitude)), 1
            )
        agencies.sort(key=lambda a: a.distance_km)

        data = [
            {
                "id": a.id,
                "agency_name": a.agency_name,
                "agency_type": a.agency_type,
                "phone": a.phone,
                "county": a.county,
                "latitude": float(a.latitude),
                "longitude": float(a.longitude),
                "distance_km": a.distance_km,
                "created_at": a.created_at,
            }
            for a in agencies[:30]
        ]
        return Response({"agencies": data})

