"""Farmer-owned produce listings for the marketplace."""
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.farmer_serializers import FarmerProductWriteSerializer
from accounts.models import FarmerProduct
from accounts.permissions import IsFarmer
from main_app.models import FarmerProfile


def _farmer_profile(request):
    profile = getattr(request.user, "farmer_profile", None)
    if profile is None:
        profile, _ = FarmerProfile.objects.get_or_create(user=request.user)
    return profile


class MyFarmerProductListCreateView(APIView):
    """Farmer owns: list + create marketplace listings."""

    permission_classes = [IsAuthenticated, IsFarmer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        profile = _farmer_profile(request)
        products = profile.market_products.all()
        return Response(
            {
                "products": FarmerProductWriteSerializer(
                    products, many=True, context={"request": request}
                ).data
            }
        )

    def post(self, request):
        profile = _farmer_profile(request)
        ser = FarmerProductWriteSerializer(
            data=request.data,
            context={"farmer": profile, "request": request},
        )
        ser.is_valid(raise_exception=True)
        product = ser.save()
        return Response(
            FarmerProductWriteSerializer(product, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyFarmerProductDetailView(APIView):
    """Farmer owns: update or delete one listing."""

    permission_classes = [IsAuthenticated, IsFarmer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_owned(self, request, product_id):
        profile = getattr(request.user, "farmer_profile", None)
        if profile is None:
            return None
        try:
            return profile.market_products.get(pk=product_id)
        except FarmerProduct.DoesNotExist:
            return None

    def patch(self, request, product_id):
        product = self._get_owned(request, product_id)
        if product is None:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = FarmerProductWriteSerializer(
            product,
            data=request.data,
            partial=True,
            context={"farmer": product.farmer, "request": request},
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, product_id):
        product = self._get_owned(request, product_id)
        if product is None:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
