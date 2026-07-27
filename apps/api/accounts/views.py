from __future__ import annotations

import hashlib
import json
import logging

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.keys import generate_raw_api_key, hash_api_key, key_prefix
from accounts.lending_auth import log_lending_usage, resolve_bearer_key
from accounts.models import LendingAPIKey, LendingAPIUsageLog, LendingPartnerProfile
from accounts.permissions import IsApprovedLendingPartner, IsLendingPartner, IsStaffUser
from rest_framework.throttling import ScopedRateThrottle

from accounts.serializers import (
    AdminLenderSerializer,
    AgencyRegisterSerializer,
    BuyerRegisterSerializer,
    FarmerProfileSerializer,
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
from main_app.utils_weather import get_weather_data

logger = logging.getLogger(__name__)


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


def _get_role_profile(user: User, request=None):
    role = resolve_user_role(user)
    if role == "farmer" and hasattr(user, "farmer_profile"):
        return FarmerProfileSerializer(
            user.farmer_profile, context={"request": request}
        ).data
    if role == "buyer" and hasattr(user, "buyer_profile"):
        p = user.buyer_profile
        photo_url = None
        if p.photo:
            url = p.photo.url
            if request is not None:
                photo_url = request.build_absolute_uri(url)
            else:
                photo_url = url
        return {
            "phone_number": p.phone_number,
            "county": p.county,
            "country": p.country,
            "first_name": p.first_name,
            "email": p.email,
            "photo": photo_url,
            "verified": True,
            "verification_badge": "Verified",
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


def _me_payload(user: User, request=None) -> dict:
    role = resolve_user_role(user)
    wallet_data = None
    if role == "farmer":
        wallet, _ = Wallet.objects.get_or_create(user=user)
        wallet_data = WalletSerializer(wallet).data
    return {
        "user": UserBriefSerializer(user).data,
        "role": role,
        "profile": _get_role_profile(user, request=request),
        "wallet": wallet_data,
    }


def _weather_for_location(location: str, country: str = "Kenya") -> dict | None:
    if not (location or "").strip():
        return None
    try:
        query = location.strip()
        if country and country.lower() not in query.lower():
            query = f"{query},{country}"
        raw = get_weather_data(query)
        data = json.loads(raw) if isinstance(raw, str) else raw
        if not isinstance(data, dict) or data.get("error"):
            if "," in query:
                raw2 = get_weather_data(location.strip())
                data = json.loads(raw2) if isinstance(raw2, str) else raw2
            if not isinstance(data, dict) or data.get("error"):
                logger.warning("Weather lookup failed for %s: %s", query, data)
                return None
        return {
            "location": data.get("location") or location,
            "temperature_celsius": data.get("temperature_celsius"),
            "humidity_percent": data.get("humidity_percent"),
            "wind_speed_m_s": data.get("wind_speed_m_s"),
            "rainfall_1h_mm": data.get("rainfall_1h_mm", 0),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Weather fetch error: %s", exc)
        return None


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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(_me_payload(request.user, request=request))

    def patch(self, request):
        if hasattr(request.data, "dict"):
            raw = request.data.dict()
        elif hasattr(request.data, "copy"):
            raw = dict(request.data.copy())
        else:
            raw = dict(request.data)
        if raw.get("farm_size_acres") in ("", "null", None):
            if "farm_size_acres" in raw:
                raw["farm_size_acres"] = None
        clear_flag = raw.get("clear_profile_photo")
        if isinstance(clear_flag, str):
            raw["clear_profile_photo"] = clear_flag.strip().lower() in (
                "1",
                "true",
                "yes",
                "on",
            )

        serializer = MeUpdateSerializer(data=raw, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        role = resolve_user_role(user)

        # Org accounts (agency / lender) have no personal name fields.
        user_fields = ("email",)
        if role in ("farmer", "buyer", "admin", "user"):
            user_fields = ("first_name", "last_name", "email")
        for field in user_fields:
            if field in data:
                setattr(user, field, data[field])
        if "email" in data and role in ("agency", "lender"):
            email = data["email"].strip().lower()
            user.email = email
            # Keep login identity in sync: org accounts use email as username.
            if (
                User.objects.filter(username=email)
                .exclude(pk=user.pk)
                .exists()
            ):
                return Response(
                    {"email": "A user with this email already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.username = email
        user.save()

        if role == "farmer" and hasattr(user, "farmer_profile"):
            profile = user.farmer_profile
            for field in (
                "phone_number",
                "county",
                "country",
                "products",
                "farm_name",
                "farm_size_acres",
            ):
                if field in data:
                    setattr(profile, field, data[field])
            photo = request.FILES.get("profile_photo")
            if photo is not None:
                if profile.profile_photo:
                    profile.profile_photo.delete(save=False)
                profile.profile_photo = photo
            elif data.get("clear_profile_photo"):
                if profile.profile_photo:
                    profile.profile_photo.delete(save=False)
                profile.profile_photo = None
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
            photo = request.FILES.get("photo") or request.FILES.get("profile_photo")
            if photo is not None:
                if profile.photo:
                    profile.photo.delete(save=False)
                profile.photo = photo
            elif data.get("clear_photo") or data.get("clear_profile_photo"):
                if profile.photo:
                    profile.photo.delete(save=False)
                profile.photo = None
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

        return Response(_me_payload(user, request=request))


class WeatherView(APIView):
    """Current weather for the authenticated farmer's county (OpenWeather)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = resolve_user_role(request.user)
        if role == "farmer" and hasattr(request.user, "farmer_profile"):
            profile = request.user.farmer_profile
            county = (request.query_params.get("location") or profile.county or "").strip()
            country = (profile.country or "Kenya").strip() or "Kenya"
        elif role == "buyer" and hasattr(request.user, "buyer_profile"):
            profile = request.user.buyer_profile
            county = (request.query_params.get("location") or profile.county or "").strip()
            country = (profile.country or "Kenya").strip() or "Kenya"
        else:
            return Response(
                {"detail": "Weather is available for farmer and buyer accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not county:
            return Response(
                {
                    "weather": None,
                    "detail": "Set your county on your profile to load local weather.",
                }
            )

        weather = _weather_for_location(county, country)
        if weather is None:
            return Response(
                {
                    "weather": None,
                    "detail": f"Could not load weather for {county}.",
                }
            )
        return Response({"weather": weather})


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


class PartnerFarmHealthScoreView(APIView):
    """
    Machine-to-machine Farm Health Score.
    Authorization: Bearer <LendingAPIKey raw secret>
    Legacy PartnerAPIKey plaintext still accepted during migration.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "lending_score"

    def get(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        raw = auth_header.split(" ", 1)[1].strip()
        lending_key, _legacy, err = resolve_bearer_key(raw)
        if err:
            return Response({"error": err}, status=status.HTTP_401_UNAUTHORIZED)

        phone = request.query_params.get("phone")
        if not phone:
            return Response(
                {"error": "Phone parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload, http_status, error = _farmer_score_payload(phone)
        log_lending_usage(lending_key=lending_key, phone=phone, http_status=http_status)
        if error:
            return Response({"error": error}, status=http_status)
        return Response(payload, status=http_status)


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
