"""API views for offline KAMIS market price lookup."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsFarmer, IsStaffUser
from main_app.kamis.query import search_prices


class KamisMarketPricesView(APIView):
    """Look up recent KAMIS prices from the local SQLite cache.

    Query params:
      - crop (required): e.g. maize, tomatoes, wheat
    """

    permission_classes = [IsAuthenticated, IsFarmer | IsStaffUser]

    def get(self, request):
        crop = (request.query_params.get("crop") or "").strip()
        if not crop:
            return Response(
                {"detail": "Query parameter 'crop' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Crop-only lookup; market/county come back on each result row.
        payload = search_prices(crop=crop)
        detail = (payload.get("detail") or "").lower()
        if payload.get("count") == 0 and (
            "empty" in detail or "stale" in detail
        ):
            return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(payload)
