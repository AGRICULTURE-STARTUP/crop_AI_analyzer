"""Resolve lending partner API keys for the M2M Farm Health Score endpoint."""

from __future__ import annotations

from django.utils import timezone

from accounts.keys import hash_api_key
from accounts.models import LendingAPIKey, LendingAPIUsageLog, LendingPartnerProfile
from main_app.models import PartnerAPIKey


def resolve_bearer_key(raw_token: str) -> tuple[LendingAPIKey | None, PartnerAPIKey | None, str | None]:
    """
    Return (lending_key, legacy_partner_key, error).

    Prefers hashed LendingAPIKey; falls back to legacy plaintext PartnerAPIKey
    so existing bank integrations keep working during migration.
    """
    if not raw_token:
        return None, None, "Unauthorized"

    key_hash = hash_api_key(raw_token)
    lending_key = (
        LendingAPIKey.objects.select_related("partner")
        .filter(key_hash=key_hash, is_active=True)
        .first()
    )
    if lending_key is not None:
        partner: LendingPartnerProfile = lending_key.partner
        if partner.verification_status == "suspended":
            return None, None, "Partner suspended"
        if partner.verification_status != "approved":
            return None, None, "Partner not approved"
        if lending_key.expires_at and lending_key.expires_at < timezone.now():
            return None, None, "API key expired"
        lending_key.last_used_at = timezone.now()
        lending_key.save(update_fields=["last_used_at"])
        return lending_key, None, None

    legacy = PartnerAPIKey.objects.filter(api_key=raw_token, is_active=True).first()
    if legacy is not None:
        return None, legacy, None

    return None, None, "Invalid or inactive API key"


def log_lending_usage(
    *,
    lending_key: LendingAPIKey | None,
    phone: str,
    http_status: int,
) -> None:
    if lending_key is None:
        return
    import hashlib

    phone_hash = hashlib.sha256(phone.encode("utf-8")).hexdigest()
    LendingAPIUsageLog.objects.create(
        api_key=lending_key,
        partner=lending_key.partner,
        phone_queried_hash=phone_hash,
        http_status=http_status,
    )
