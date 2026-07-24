from __future__ import annotations

import hashlib

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.keys import generate_raw_api_key, hash_api_key, key_prefix
from accounts.models import LendingAPIKey, LendingAPIUsageLog, LendingPartnerProfile
from accounts.permissions import IsApprovedLendingPartner, IsLendingPartner, IsStaffUser
from accounts.serializers import (
    AdminLenderSerializer,
    AgencyRegisterSerializer,
    BuyerRegisterSerializer,
    FarmerRegisterSerializer,
    LendingAPIKeyCreateSerializer,
    LendingAPIKeySerializer,
    LendingAPIUsageLogSerializer,
    LendingPartnerProfileSerializer,
    LenderRegisterSerializer,
    MeUpdateSerializer,
    MpesaTopupSerializer,
    UserBriefSerializer,
    WalletSerializer,
    issue_tokens,
    resolve_user_role,
)
from main_app.models import FarmerProfile, FarmHealthProfile, MpesaTransaction, Wallet
from main_app.mpesa_utils import MpesaGateway
from main_app.utils_scoring import calculate_farm_health_score


def _registration_response(user: User) -> Response:
    role = resolve_user_role(user)
    tokens = issue_tokens(user)
    return Response(
        {
            **tokens,
            "role": role,
            "user": UserBriefSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


def _get_role_profile(user: User):
    role = resolve_user_role(user)
    if role == "farmer" and hasattr(user, "farmer_profile"):
        p = user.farmer_profile
        return {
            "phone_number": p.phone_number,
            "county": p.county,
            "country": p.country,
            "products": p.products,
        }
    if role == "buyer" and hasattr(user, "buyer_profile"):
        p = user.buyer_profile
        return {
            "phone_number": p.phone_number,
            "county": p.county,
            "country": p.country,
            "first_name": p.first_name,
            "email": p.email,
        }
    if role == "agency" and hasattr(user, "agency_profile"):
        p = user.agency_profile
        return {
            "agency_name": p.agency_name,
            "agency_type": p.agency_type,
            "phone": p.phone,
            "county": p.county,
        }
    if role == "lender" and hasattr(user, "lending_partner_profile"):
        return LendingPartnerProfileSerializer(user.lending_partner_profile).data
    return None


def _me_payload(user: User) -> dict:
    role = resolve_user_role(user)
    wallet_data = None
    if role == "farmer":
        wallet, _ = Wallet.objects.get_or_create(user=user)
        wallet_data = WalletSerializer(wallet).data
    return {
        "user": UserBriefSerializer(user).data,
        "role": role,
        "profile": _get_role_profile(user),
        "wallet": wallet_data,
    }


def _farmer_score_payload(phone: str) -> tuple[dict | None, int, str | None]:
    """Return (payload, http_status, error_message)."""
    try:
        farmer = FarmerProfile.objects.get(phone_number=phone)
    except FarmerProfile.DoesNotExist:
        # Also try normalized variants
        variants = {phone}
        digits = "".join(c for c in phone if c.isdigit())
        if digits:
            variants.add(digits)
            if digits.startswith("0") and len(digits) == 10:
                variants.add("254" + digits[1:])
            if digits.startswith("254"):
                variants.add("0" + digits[3:])
        farmer = FarmerProfile.objects.filter(phone_number__in=variants).first()
        if farmer is None:
            return None, 404, "Farmer not found"

    try:
        health_profile = farmer.health_profile
    except FarmHealthProfile.DoesNotExist:
        health_profile = calculate_farm_health_score(farmer)

    if not health_profile.opt_in_for_lending:
        return None, 403, "User has not consented to data sharing"

    # Refresh score on lookup
    health_profile = calculate_farm_health_score(farmer)

    return (
        {
            "farmer_name": (
                f"{farmer.user.first_name} {farmer.user.last_name}".strip()
                or farmer.user.username
            ),
            "county": farmer.county,
            "health_score": health_profile.health_score,
            "risk_tier": health_profile.risk_tier,
            "active_connections": farmer.market_connections.filter(
                status="Completed"
            ).count(),
            "total_scans": farmer.scan_logs.count(),
        },
        200,
        None,
    )


class FarmerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = FarmerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _registration_response(user)


class BuyerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BuyerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _registration_response(user)


class AgencyRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AgencyRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _registration_response(user)


class LenderRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LenderRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _registration_response(user)


class LogoutView(APIView):
    """Client discards tokens; endpoint is intentionally a no-op."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_me_payload(request.user))

    def patch(self, request):
        serializer = MeUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user

        for field in ("first_name", "last_name", "email"):
            if field in data:
                setattr(user, field, data[field])
        user.save()

        role = resolve_user_role(user)
        if role == "farmer" and hasattr(user, "farmer_profile"):
            profile = user.farmer_profile
            for field in ("phone_number", "county", "country", "products"):
                if field in data:
                    setattr(profile, field, data[field])
            profile.save()
        elif role == "buyer" and hasattr(user, "buyer_profile"):
            profile = user.buyer_profile
            for field in ("phone_number", "county", "country"):
                if field in data:
                    setattr(profile, field, data[field])
            if "first_name" in data:
                profile.first_name = data["first_name"]
            if "email" in data:
                profile.email = data["email"]
            profile.save()
        elif role == "agency" and hasattr(user, "agency_profile"):
            profile = user.agency_profile
            for field in ("agency_name", "agency_type", "phone", "county"):
                if field in data:
                    setattr(profile, field, data[field])
            profile.save()
        elif role == "lender" and hasattr(user, "lending_partner_profile"):
            profile = user.lending_partner_profile
            for field in (
                "organization_name",
                "organization_type",
                "registration_number",
                "contact_phone",
                "county",
                "website",
            ):
                if field in data:
                    setattr(profile, field, data[field])
            profile.save()

        return Response(_me_payload(user))


class LenderMeView(APIView):
    permission_classes = [IsAuthenticated, IsLendingPartner]
    allow_pending_read = True

    def get(self, request):
        return Response(
            LendingPartnerProfileSerializer(request.user.lending_partner_profile).data
        )

    def patch(self, request):
        profile = request.user.lending_partner_profile
        serializer = LendingPartnerProfileSerializer(
            profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LenderAPIKeyListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsLendingPartner]

    def get(self, request):
        keys = request.user.lending_partner_profile.api_keys.all()
        return Response(LendingAPIKeySerializer(keys, many=True).data)

    def post(self, request):
        partner = request.user.lending_partner_profile
        if partner.verification_status != "approved":
            return Response(
                {"detail": "Lending partner must be approved to create API keys."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if partner.verification_status == "suspended":
            return Response(
                {"detail": "Suspended partners cannot create API keys."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = LendingAPIKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw = generate_raw_api_key()
        key = LendingAPIKey.objects.create(
            partner=partner,
            name=serializer.validated_data.get("name") or "Default",
            key_prefix=key_prefix(raw),
            key_hash=hash_api_key(raw),
            is_active=True,
            expires_at=serializer.validated_data.get("expires_at"),
        )
        data = LendingAPIKeySerializer(key).data
        data["api_key"] = raw
        return Response(data, status=status.HTTP_201_CREATED)


class LenderAPIKeyRotateView(APIView):
    permission_classes = [IsAuthenticated, IsApprovedLendingPartner]

    def post(self, request, key_id: int):
        partner = request.user.lending_partner_profile
        try:
            old_key = partner.api_keys.get(pk=key_id)
        except LendingAPIKey.DoesNotExist:
            return Response({"detail": "API key not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            old_key.is_active = False
            old_key.save(update_fields=["is_active"])

            raw = generate_raw_api_key()
            new_key = LendingAPIKey.objects.create(
                partner=partner,
                name=old_key.name,
                key_prefix=key_prefix(raw),
                key_hash=hash_api_key(raw),
                is_active=True,
                expires_at=old_key.expires_at,
            )

        data = LendingAPIKeySerializer(new_key).data
        data["api_key"] = raw
        data["rotated_from"] = old_key.id
        return Response(data, status=status.HTTP_201_CREATED)


class LenderAPIKeyRevokeView(APIView):
    permission_classes = [IsAuthenticated, IsLendingPartner]

    def post(self, request, key_id: int):
        partner = request.user.lending_partner_profile
        try:
            key = partner.api_keys.get(pk=key_id)
        except LendingAPIKey.DoesNotExist:
            return Response({"detail": "API key not found."}, status=status.HTTP_404_NOT_FOUND)
        key.is_active = False
        key.save(update_fields=["is_active"])
        return Response(LendingAPIKeySerializer(key).data)


class LenderUsageView(APIView):
    permission_classes = [IsAuthenticated, IsLendingPartner]

    def get(self, request):
        logs = request.user.lending_partner_profile.usage_logs.all()[:100]
        return Response(LendingAPIUsageLogSerializer(logs, many=True).data)


class LenderScoreView(APIView):
    """JWT dashboard tool — same payload as public partner score API."""

    permission_classes = [IsAuthenticated, IsApprovedLendingPartner]

    def get(self, request):
        partner = request.user.lending_partner_profile
        if partner.verification_status == "suspended":
            return Response(
                {"detail": "Partner suspended."},
                status=status.HTTP_403_FORBIDDEN,
            )

        phone = request.query_params.get("phone")
        if not phone:
            return Response(
                {"error": "Phone parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload, http_status, error = _farmer_score_payload(phone)
        phone_hash = hashlib.sha256(phone.encode("utf-8")).hexdigest()
        LendingAPIUsageLog.objects.create(
            api_key=None,
            partner=partner,
            phone_queried_hash=phone_hash,
            http_status=http_status,
        )
        if error:
            return Response({"error": error}, status=http_status)
        return Response(payload, status=http_status)


class AdminLenderListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = LendingPartnerProfile.objects.select_related("user").all()
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        return Response(AdminLenderSerializer(qs, many=True).data)


class AdminLenderApproveView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def post(self, request, partner_id: int):
        try:
            partner = LendingPartnerProfile.objects.get(pk=partner_id)
        except LendingPartnerProfile.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        partner.verification_status = "approved"
        partner.verified_at = timezone.now()
        partner.verified_by = request.user
        partner.save(
            update_fields=["verification_status", "verified_at", "verified_by"]
        )
        return Response(AdminLenderSerializer(partner).data)


class AdminLenderSuspendView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def post(self, request, partner_id: int):
        try:
            partner = LendingPartnerProfile.objects.get(pk=partner_id)
        except LendingPartnerProfile.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        partner.verification_status = "suspended"
        partner.save(update_fields=["verification_status"])
        partner.api_keys.filter(is_active=True).update(is_active=False)
        return Response(AdminLenderSerializer(partner).data)


class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response(WalletSerializer(wallet).data)


class MpesaTopupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MpesaTopupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]
        phone = serializer.validated_data["phone_number"]

        callback_url = request.build_absolute_uri("/mpesa/callback/")
        mpesa_client = MpesaGateway()
        response = mpesa_client.initiate_stk_push(phone, amount, callback_url)

        if "CheckoutRequestID" in response:
            MpesaTransaction.objects.create(
                user=request.user,
                phone_number=phone,
                amount=amount,
                checkout_request_id=response["CheckoutRequestID"],
                merchant_request_id=response.get("MerchantRequestID", ""),
            )
            return Response(
                {
                    "status": "Success",
                    "message": "STK Push sent to your phone. Please enter your M-Pesa PIN.",
                    "checkout_request_id": response["CheckoutRequestID"],
                }
            )
        return Response(
            {
                "status": "Error",
                "message": response.get(
                    "errorMessage",
                    response.get("error", "Failed to initiate M-Pesa payment."),
                ),
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
