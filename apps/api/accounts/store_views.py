"""Public agro-input storefront: browse, filter, sort and open products.

Anyone can browse. Seller phone numbers are only included for signed-in users;
listings an admin has hidden, or the agency marked unavailable, never appear.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from math import ceil

from django.db.models import Count, F, Max, Min, Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.models import AgencyProduct, AgencyProfile

CATEGORY_LABELS = dict(AgencyProduct.CATEGORY_CHOICES)
AGENCY_TYPE_LABELS = dict(AgencyProfile.AGENCY_TYPE_CHOICES)
SORTS = {
    "newest": ("-created_at",),
    "price_asc": (F("price").asc(nulls_last=True), "-created_at"),
    "price_desc": (F("price").desc(nulls_last=True), "-created_at"),
    "name": ("name", "-created_at"),
}
PAGE_SIZE = 12
MAX_PAGE_SIZE = 48


def listed_products():
    return AgencyProduct.objects.filter(is_available=True, is_hidden=False).select_related(
        "agency"
    )


def _decimal(raw: str | None) -> Decimal | None:
    if raw in (None, ""):
        return None
    try:
        value = Decimal(str(raw).strip())
    except (InvalidOperation, ValueError):
        return None
    return value if value.is_finite() and value >= 0 else None


def _bounded_int(raw, default: int, low: int, high: int) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, value))


def _image_url(request, product: AgencyProduct) -> str | None:
    if not product.image:
        return None
    try:
        url = product.image.url
    except ValueError:
        return None
    return url if url.startswith("http") else request.build_absolute_uri(url)


def _seller(agency: AgencyProfile, show_contact: bool) -> dict:
    return {
        "id": agency.id,
        "name": agency.agency_name,
        "type": agency.agency_type,
        "type_label": AGENCY_TYPE_LABELS.get(agency.agency_type, agency.agency_type),
        "county": agency.county,
        "phone": agency.phone if show_contact else None,
    }


def product_card(request, product: AgencyProduct, show_contact: bool) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "category": product.category,
        "category_label": CATEGORY_LABELS.get(product.category, product.category),
        "description": product.description,
        "price": str(product.price) if product.price is not None else None,
        "unit": product.unit,
        "image": _image_url(request, product),
        "created_at": product.created_at,
        "updated_at": product.updated_at,
        "seller": _seller(product.agency, show_contact),
    }


def _signed_in(request) -> bool:
    return bool(request.user and request.user.is_authenticated)


class StoreProductListView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "store"

    def get(self, request):
        params = request.query_params
        base = listed_products()

        q = params.get("q", "").strip()[:100]
        if q:
            base = base.filter(
                Q(name__icontains=q)
                | Q(description__icontains=q)
                | Q(agency__agency_name__icontains=q)
            )
        county = params.get("county", "").strip()[:100]
        if county:
            base = base.filter(agency__county__icontains=county)
        seller = params.get("seller", "").strip()
        if seller.isdigit():
            base = base.filter(agency_id=int(seller))
        min_price = _decimal(params.get("min_price"))
        if min_price is not None:
            base = base.filter(price__gte=min_price)
        max_price = _decimal(params.get("max_price"))
        if max_price is not None:
            base = base.filter(price__lte=max_price)

        # Category counts ignore the category filter so the sidebar lists them all.
        category_counts = {
            row["category"]: row["n"]
            for row in base.values("category").annotate(n=Count("id"))
        }
        category = params.get("category", "").strip().lower()
        qs = base.filter(category=category) if category in CATEGORY_LABELS else base

        sort = params.get("sort", "newest")
        if sort not in SORTS:
            sort = "newest"
        qs = qs.order_by(*SORTS[sort])

        count = qs.count()
        page_size = _bounded_int(params.get("page_size"), PAGE_SIZE, 1, MAX_PAGE_SIZE)
        pages = max(1, ceil(count / page_size))
        page = _bounded_int(params.get("page"), 1, 1, pages)
        items = qs[(page - 1) * page_size : page * page_size]

        listed = listed_products()
        price_range = listed.filter(price__isnull=False).aggregate(
            low=Min("price"), high=Max("price")
        )
        counties = (
            listed.order_by("agency__county")
            .values_list("agency__county", flat=True)
            .distinct()
        )
        show_contact = _signed_in(request)
        return Response(
            {
                "results": [product_card(request, p, show_contact) for p in items],
                "count": count,
                "page": page,
                "pages": pages,
                "page_size": page_size,
                "sort": sort,
                "facets": {
                    "categories": [
                        {"value": value, "label": label, "count": category_counts.get(value, 0)}
                        for value, label in AgencyProduct.CATEGORY_CHOICES
                    ],
                    "counties": [c for c in list(counties)[:60] if c],
                    "price": {
                        "min": str(price_range["low"]) if price_range["low"] is not None else None,
                        "max": str(price_range["high"]) if price_range["high"] is not None else None,
                    },
                },
                "contact_visible": show_contact,
            }
        )


class StoreProductDetailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "store"

    def get(self, request, product_id: int):
        product = listed_products().filter(pk=product_id).first()
        if product is None:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        show_contact = _signed_in(request)
        agency = product.agency
        related = (
            listed_products()
            .filter(category=product.category)
            .exclude(pk=product.pk)
            .order_by("-created_at")[:8]
        )
        from_seller = (
            listed_products()
            .filter(agency=agency)
            .exclude(pk=product.pk)
            .order_by("-created_at")[:8]
        )
        return Response(
            {
                "product": product_card(request, product, show_contact),
                "seller": {
                    **_seller(agency, show_contact),
                    "product_count": listed_products().filter(agency=agency).count(),
                    "member_since": agency.created_at,
                },
                "related": [product_card(request, p, show_contact) for p in related],
                "more_from_seller": [
                    product_card(request, p, show_contact) for p in from_seller
                ],
                "contact_visible": show_contact,
            }
        )
