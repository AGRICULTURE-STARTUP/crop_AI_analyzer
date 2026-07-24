"""USSD / SMS gateway endpoints.

Live providers (Africa's Talking, Twilio, TextSMS) will POST here once
credentials are configured. Until then the homepage simulator calls the
same JSON contract at POST /api/v1/ussd/simulate/.
"""

from __future__ import annotations

import hmac

from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from accounts.ussd_engine import handle_ussd


class UssdThrottle(ScopedRateThrottle):
    scope = "ussd"


def _extract_payload(request) -> dict:
    """Accept JSON or form-encoded Africa's Talking fields."""
    data = request.data
    if hasattr(data, "dict"):
        data = data.dict()
    phone = (
        data.get("phoneNumber")
        or data.get("phone_number")
        or data.get("From")
        or ""
    )
    session_id = (
        data.get("sessionId")
        or data.get("session_id")
        or data.get("MessageSid")
        or data.get("CallSid")
        or "sim-session"
    )
    text = data.get("text") or data.get("Text") or data.get("Body") or ""
    service_code = (
        data.get("serviceCode")
        or data.get("service_code")
        or getattr(settings, "USSD_SERVICE_CODE", "*384*55#")
    )
    return {
        "phone_number": str(phone).strip(),
        "session_id": str(session_id).strip(),
        "text": str(text).strip(),
        "service_code": str(service_code).strip(),
    }


def _provider_authorized(request) -> bool:
    """When live secrets are set, require a simple shared-secret header.

    Providers differ; we accept:
      X-AgriScan-USSD-Secret: <AFRICASTALKING_API_KEY|TWILIO_AUTH_TOKEN|TEXTSMS_API_KEY>
    In DEV_ENV / simulate mode, always allow.
    """
    if getattr(settings, "DEV_ENV", False):
        return True
    if getattr(settings, "USSD_PROVIDER", "simulate") == "simulate":
        return True

    secret = (
        getattr(settings, "AFRICASTALKING_API_KEY", "")
        or getattr(settings, "TWILIO_AUTH_TOKEN", "")
        or getattr(settings, "TEXTSMS_API_KEY", "")
    )
    if not secret:
        # Credentials not configured yet — keep endpoint open for staging wiring,
        # but production should set secrets.
        return True

    provided = request.headers.get("X-AgriScan-USSD-Secret", "")
    return hmac.compare_digest(provided, secret)


@method_decorator(csrf_exempt, name="dispatch")
class UssdGatewayView(APIView):
    """
    Production webhook for Africa's Talking-style USSD.

    AT expects plain text: "CON …" or "END …"
    """

    permission_classes = [AllowAny]
    throttle_classes = [UssdThrottle]
    throttle_scope = "ussd"
    authentication_classes = []

    def post(self, request):
        if not _provider_authorized(request):
            return Response(
                {"detail": "Unauthorized USSD gateway."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        payload = _extract_payload(request)
        if not payload["phone_number"]:
            return HttpResponse("END Phone number required.", content_type="text/plain")

        reply = handle_ussd(**payload)
        # Africa's Talking reads the raw body as the USSD screen.
        return HttpResponse(reply.as_africastalking(), content_type="text/plain")


@method_decorator(csrf_exempt, name="dispatch")
class UssdSimulateView(APIView):
    """JSON simulator used by the homepage phone UI (and Capacitor demos)."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UssdThrottle]
    throttle_scope = "ussd"
    authentication_classes = []

    def post(self, request):
        payload = _extract_payload(request)
        if not payload["session_id"]:
            payload["session_id"] = "homepage-sim"
        if not payload["phone_number"]:
            payload["phone_number"] = "254700000000"

        reply = handle_ussd(**payload)
        return Response(
            {
                **reply.as_json(),
                "session_id": payload["session_id"],
                "phone_number": payload["phone_number"],
                "service_code": payload["service_code"],
                "provider": getattr(settings, "USSD_PROVIDER", "simulate"),
                "note": (
                    "Simulation only. Point Africa's Talking / Twilio / TextSMS "
                    "to POST /api/v1/ussd/ when live credentials arrive."
                ),
            }
        )

    def get(self, request):
        """Menu metadata for the homepage simulator chrome."""
        return Response(
            {
                "service_code": getattr(settings, "USSD_SERVICE_CODE", "*384*55#"),
                "provider": getattr(settings, "USSD_PROVIDER", "simulate"),
                "features": [
                    "wallet",
                    "agribot",
                    "market",
                    "inputs",
                    "farm_health_score",
                    "lending_consent",
                    "profile",
                    "topup_help",
                ],
                "excluded": ["crop_scan"],
                "excluded_reason": "Scanning needs a camera — use the AgriScan app.",
            }
        )
