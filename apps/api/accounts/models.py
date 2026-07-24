from django.conf import settings
from django.db import models


class AgencyProfile(models.Model):
    """Minimal input/agrovet agency profile for SPA signup."""

    AGENCY_TYPE_CHOICES = [
        ("agrovet", "Agrovet / All-in-One Supplier"),
        ("fertiliser", "Fertiliser Company"),
        ("pesticide", "Pesticide Company"),
        ("seed", "Seed Company"),
        ("other", "Other"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agency_profile",
    )
    agency_name = models.CharField(max_length=150)
    agency_type = models.CharField(
        max_length=20, choices=AGENCY_TYPE_CHOICES, default="agrovet"
    )
    phone = models.CharField(max_length=20, blank=True, default="")
    county = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.agency_name} ({self.user.username})"


class LendingPartnerProfile(models.Model):
    """Self-service lending / loan agency account."""

    ORG_TYPE_CHOICES = [
        ("bank", "Bank"),
        ("mfi", "Microfinance Institution"),
        ("sacco", "SACCO"),
        ("fintech", "Fintech"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("suspended", "Suspended"),
        ("rejected", "Rejected"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lending_partner_profile",
    )
    organization_name = models.CharField(max_length=200)
    organization_type = models.CharField(
        max_length=20, choices=ORG_TYPE_CHOICES, default="other"
    )
    registration_number = models.CharField(max_length=100, blank=True, default="")
    contact_phone = models.CharField(max_length=20, blank=True, default="")
    county = models.CharField(max_length=100, blank=True, default="")
    website = models.URLField(blank=True, default="")
    verification_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_lending_partners",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.organization_name} [{self.verification_status}]"

    @property
    def is_approved(self) -> bool:
        return self.verification_status == "approved"


class LendingAPIKey(models.Model):
    """Hashed API keys for Farm Health Score machine-to-machine access."""

    partner = models.ForeignKey(
        LendingPartnerProfile,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    name = models.CharField(max_length=100, default="Default")
    key_prefix = models.CharField(max_length=16)
    key_hash = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.partner.organization_name}:{self.name} ({self.key_prefix}…)"


class LendingAPIUsageLog(models.Model):
    """Optional audit log for score lookups."""

    api_key = models.ForeignKey(
        LendingAPIKey,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usage_logs",
    )
    partner = models.ForeignKey(
        LendingPartnerProfile,
        on_delete=models.CASCADE,
        related_name="usage_logs",
    )
    phone_queried_hash = models.CharField(max_length=64, blank=True, default="")
    http_status = models.PositiveSmallIntegerField(default=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.partner_id} status={self.http_status} @ {self.created_at}"
