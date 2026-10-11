"""Admin console API: overview metrics, user management and listing moderation.

All views are staff-only. Staff accounts themselves are never changed here —
that stays in Django admin.
"""

from __future__ import annotations

from datetime import timedelta
from math import ceil

from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AgencyProduct, AgencyProfile, LendingPartnerProfile
from accounts.permissions import IsStaffUser
from accounts.serializers import resolve_user_role
from accounts.store_views import CATEGORY_LABELS, product_card
from main_app.models import BuyerProfile, FarmerProfile, MpesaTransaction, Wallet
from recommend.crops import crop_meta
from recommend.models import CropRecommendation
from scanner.models import ScanJob

SERIES_DAYS = 30
USER_PAGE_SIZE = 20
PRODUCT_PAGE_SIZE = 20
ROLES = ("farmer", "buyer", "agency", "lender", "admin")


def _daily(queryset, field: str, since, value: str | None = None) -> list[dict]:
    """One point per day for the last SERIES_DAYS days (missing days are 0)."""
    aggregate = Sum(value) if value else Count("id")
    rows = (
        queryset.filter(**{f"{field}__date__gte": since})
        .annotate(day=TruncDate(field))
        .values("day")
        .annotate(total=aggregate)
    )
    by_day = {row["day"]: row["total"] for row in rows}
    points = []
    for offset in range(SERIES_DAYS):
        day = since + timedelta(days=offset)
        points.append({"date": day.isoformat(), "value": float(by_day.get(day) or 0)})
    return points


def _user_detail(user: User) -> str:
    for attr, field in (
        ("lending_partner_profile", "organization_name"),
        ("agency_profile", "agency_name"),
        ("farmer_profile", "county"),
        ("buyer_profile", "county"),
    ):
        profile = getattr(user, attr, None)
        if profile is not None:
            return getattr(profile, field, "") or ""
    return ""


def _user_row(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}".strip(),
        "role": resolve_user_role(user),
        "detail": _user_detail(user),
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }


def _role_filter(role: str) -> Q | None:
    return {
        "admin": Q(is_staff=True),
        "lender": Q(lending_partner_profile__isnull=False, is_staff=False),
        "agency": Q(agency_profile__isnull=False, is_staff=False),
        "buyer": Q(buyer_profile__isnull=False, is_staff=False),
        "farmer": Q(farmer_profile__isnull=False, is_staff=False),
    }.get(role)


class AdminOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        since = timezone.localdate() - timedelta(days=SERIES_DAYS - 1)

        successful = MpesaTransaction.objects.filter(status="Success")
        products = AgencyProduct.objects.all()
        recommendations = CropRecommendation.objects.all()

        role_counts = {
            "farmer": FarmerProfile.objects.count(),
            "buyer": BuyerProfile.objects.count(),
            "agency": AgencyProfile.objects.count(),
            "lender": LendingPartnerProfile.objects.count(),
            "admin": User.objects.filter(is_staff=True).count(),
        }

        top_crops = (
            recommendations.values("top_crop")
            .annotate(count=Count("id"))
            .order_by("-count")[:6]
        )
        category_counts = (
            products.filter(is_hidden=False).values("category").annotate(count=Count("id"))
        )

        return Response(
            {
                "kpis": {
                    "users_total": User.objects.count(),
                    "users_new_7d": User.objects.filter(date_joined__gte=week_ago).count(),
                    "revenue_total": str(successful.aggregate(t=Sum("amount"))["t"] or 0),
                    "revenue_30d": str(
                        successful.filter(created_at__gte=month_ago).aggregate(t=Sum("amount"))["t"]
                        or 0
                    ),
                    "payments_pending": MpesaTransaction.objects.filter(status="Pending").count(),
                    "wallet_balances": str(Wallet.objects.aggregate(t=Sum("balance"))["t"] or 0),
                    "scans_total": ScanJob.objects.count(),
                    "scans_7d": ScanJob.objects.filter(created_at__gte=week_ago).count(),
                    "products_total": products.count(),
                    "products_live": products.filter(is_available=True, is_hidden=False).count(),
                    "products_hidden": products.filter(is_hidden=True).count(),
                    "recommendations_total": recommendations.count(),
                    "recommendations_7d": recommendations.filter(created_at__gte=week_ago).count(),
                    "lenders_pending": LendingPartnerProfile.objects.filter(
                        verification_status="pending"
                    ).count(),
                },
                "series": {
                    "signups": _daily(User.objects.all(), "date_joined", since),
                    "revenue": _daily(successful, "created_at", since, value="amount"),
                    "scans": _daily(ScanJob.objects.all(), "created_at", since),
                    "recommendations": _daily(recommendations, "created_at", since),
                },
                "breakdown": {
                    "roles": [{"role": r, "count": role_counts[r]} for r in ROLES],
                    "scan_status": list(
                        ScanJob.objects.values("status").annotate(count=Count("id")).order_by("-count")
                    ),
                    "top_crops": [
                        {
                            "slug": row["top_crop"],
                            "name": (crop_meta(row["top_crop"]) or {}).get("name", row["top_crop"]),
                            "count": row["count"],
                        }
                        for row in top_crops
                    ],
                    "product_categories": [
                        {
                            "category": row["category"],
                            "label": CATEGORY_LABELS.get(row["category"], row["category"]),
                            "count": row["count"],
                        }
                        for row in category_counts
                    ],
                },
                "recent": {
                    "users": [
                        _user_row(u)
                        for u in User.objects.select_related(
                            "farmer_profile",
                            "buyer_profile",
                            "agency_profile",
                            "lending_partner_profile",
                        ).order_by("-date_joined")[:8]
                    ],
                    "transactions": [
                        {
                            "id": t.id,
                            "username": t.user.get_username(),
                            "amount": str(t.amount),
                            "status": t.status,
                            "created_at": t.created_at,
                        }
                        for t in MpesaTransaction.objects.select_related("user").order_by(
                            "-created_at"
                        )[:6]
                    ],
                    "pending_lenders": [
                        {
                            "id": p.id,
                            "organization_name": p.organization_name,
                            "organization_type": p.organization_type,
                            "county": p.county,
                            "created_at": p.created_at,
                        }
                        for p in LendingPartnerProfile.objects.filter(
                            verification_status="pending"
                        ).order_by("-created_at")[:5]
                    ],
                },
                "generated_at": now,
            }
        )


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        params = request.query_params
        qs = User.objects.select_related(
            "farmer_profile", "buyer_profile", "agency_profile", "lending_partner_profile"
        ).order_by("-date_joined")

        role_q = _role_filter(params.get("role", "").strip().lower())
        if role_q is not None:
            qs = qs.filter(role_q)
        state = params.get("status", "").strip().lower()
        if state == "active":
            qs = qs.filter(is_active=True)
        elif state == "inactive":
            qs = qs.filter(is_active=False)
        q = params.get("q", "").strip()[:100]
        if q:
            qs = qs.filter(
                Q(username__icontains=q)
                | Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
            )

        count = qs.count()
        pages = max(1, ceil(count / USER_PAGE_SIZE))
        try:
            page = max(1, min(pages, int(params.get("page", 1))))
        except (TypeError, ValueError):
            page = 1
        rows = qs[(page - 1) * USER_PAGE_SIZE : page * USER_PAGE_SIZE]

        all_users = User.objects.all()
        role_totals = {role: all_users.filter(_role_filter(role)).count() for role in ROLES}
        return Response(
            {
                "results": [_user_row(u) for u in rows],
                "count": count,
                "page": page,
                "pages": pages,
                "role_totals": role_totals,
            }
        )


class AdminUserActiveView(APIView):
    """POST {"is_active": bool} to suspend or restore a non-staff account."""

    permission_classes = [IsAuthenticated, IsStaffUser]

    def post(self, request, user_id: int):
        target = User.objects.filter(pk=user_id).first()
        if target is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if target.pk == request.user.pk or target.is_staff or target.is_superuser:
            return Response(
                {"detail": "Staff accounts can only be changed in Django admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        is_active = request.data.get("is_active")
        if not isinstance(is_active, bool):
            return Response(
                {"detail": "Send is_active as true or false."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.is_active = is_active
        target.save(update_fields=["is_active"])
        return Response(_user_row(target))


class AdminProductListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        params = request.query_params
        qs = AgencyProduct.objects.select_related("agency").order_by("-created_at")
        q = params.get("q", "").strip()[:100]
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(agency__agency_name__icontains=q))
        category = params.get("category", "").strip().lower()
        if category in CATEGORY_LABELS:
            qs = qs.filter(category=category)
        state = params.get("status", "").strip().lower()
        if state == "live":
            qs = qs.filter(is_available=True, is_hidden=False)
        elif state == "hidden":
            qs = qs.filter(is_hidden=True)
        elif state == "unavailable":
            qs = qs.filter(is_available=False, is_hidden=False)

        count = qs.count()
        pages = max(1, ceil(count / PRODUCT_PAGE_SIZE))
        try:
            page = max(1, min(pages, int(params.get("page", 1))))
        except (TypeError, ValueError):
            page = 1
        rows = qs[(page - 1) * PRODUCT_PAGE_SIZE : page * PRODUCT_PAGE_SIZE]
        all_products = AgencyProduct.objects.all()
        return Response(
            {
                "results": [
                    {
                        **product_card(request, p, show_contact=True),
                        "is_available": p.is_available,
                        "is_hidden": p.is_hidden,
                    }
                    for p in rows
                ],
                "count": count,
                "page": page,
                "pages": pages,
                "totals": {
                    "all": all_products.count(),
                    "live": all_products.filter(is_available=True, is_hidden=False).count(),
                    "hidden": all_products.filter(is_hidden=True).count(),
                    "unavailable": all_products.filter(
                        is_available=False, is_hidden=False
                    ).count(),
                },
            }
        )


class AdminProductVisibilityView(APIView):
    """POST {"is_hidden": bool} to hide a listing from the marketplace or restore it."""

    permission_classes = [IsAuthenticated, IsStaffUser]

    def post(self, request, product_id: int):
        product = AgencyProduct.objects.select_related("agency").filter(pk=product_id).first()
        if product is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        is_hidden = request.data.get("is_hidden")
        if not isinstance(is_hidden, bool):
            return Response(
                {"detail": "Send is_hidden as true or false."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product.is_hidden = is_hidden
        product.save(update_fields=["is_hidden", "updated_at"])
        return Response(
            {
                **product_card(request, product, show_contact=True),
                "is_available": product.is_available,
                "is_hidden": product.is_hidden,
            }
        )
