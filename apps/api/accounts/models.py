from django.conf import settings
from django.db import models


class AgencyProfile(models.Model):
    """
    Input / agrovet agency account.

    Identity is organizational (agency_name + user.email). Personal fields such as
    first/last name or a separate username are not used for this role — the linked
    User is created with username=email and blank names at registration.
    """

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
    phone = models.CharField(max_length=20)
    county = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.agency_name} ({self.user.email or self.user.username})"


class AgencyProduct(models.Model):
    """Product listed by a registered input / agrovet agency."""

    CATEGORY_CHOICES = [
        ("fertiliser", "Fertiliser"),
        ("seed", "Seed"),
        ("pesticide", "Pesticide"),
        ("equipment", "Equipment"),
        ("other", "Other"),
    ]

    agency = models.ForeignKey(
        AgencyProfile,
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=150)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="other"
    )
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    unit = models.CharField(max_length=40, blank=True, default="")
    image = models.ImageField(
        upload_to="agency_products/", blank=True, null=True
    )
    is_available = models.BooleanField(default=True)
    is_hidden = models.BooleanField(
        default=False,
        help_text="Hidden from the marketplace by an AgriScan admin.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.agency.agency_name}"


class LendingPartnerProfile(models.Model):
    """
    Self-service lending / loan agency account.

    Identity is organizational (organization_name + user.email). Personal fields
    such as first/last name or a separate username are not used — the linked User
    is created with username=email and blank names at registration.
    """

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
    registration_number = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=20)
    county = models.CharField(max_length=100)
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
