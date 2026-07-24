from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import (
    AgencyProfile,
    LendingAPIKey,
    LendingAPIUsageLog,
    LendingPartnerProfile,
)
from main_app.models import BuyerProfile, FarmerProfile, Wallet


def resolve_user_role(user: User) -> str:
    if user.is_staff:
        return "admin"
    if hasattr(user, "lending_partner_profile"):
        return "lender"
    if hasattr(user, "agency_profile"):
        return "agency"
    if hasattr(user, "buyer_profile"):
        return "buyer"
    if hasattr(user, "farmer_profile"):
        return "farmer"
    return "user"


def issue_tokens(user: User) -> dict:
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class UserBriefSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")

    def get_role(self, obj):
        return resolve_user_role(obj)


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = ("phone_number", "county", "country", "products")


class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = ("phone_number", "county", "country", "first_name", "email")


class AgencyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyProfile
        fields = ("agency_name", "agency_type", "phone", "county", "created_at")
        read_only_fields = ("created_at",)


class LendingPartnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LendingPartnerProfile
        fields = (
            "id",
            "organization_name",
            "organization_type",
            "registration_number",
            "contact_phone",
            "county",
            "website",
            "verification_status",
            "verified_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "verification_status",
            "verified_at",
            "created_at",
        )


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ("balance", "scan_count", "chat_count", "last_updated")
        read_only_fields = fields


class MeSerializer(serializers.Serializer):
    user = UserBriefSerializer()
    role = serializers.CharField()
    profile = serializers.DictField(allow_null=True)
    wallet = WalletSerializer(allow_null=True)


class BaseRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=30)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=30)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def _create_user(self, validated_data: dict) -> User:
        email = validated_data["email"]
        username = (validated_data.get("username") or "").strip() or email
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError(
                {"username": "A user with this username already exists."}
            )
        return User.objects.create_user(
            username=username,
            email=email,
            password=validated_data["password"],
            first_name=validated_data.get("first_name") or "",
            last_name=validated_data.get("last_name") or "",
        )


class FarmerRegisterSerializer(BaseRegisterSerializer):
    phone_number = serializers.CharField(max_length=20)
    county = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100, required=False, default="Kenya")
    products = serializers.CharField(required=False, allow_blank=True, default="")

    def create(self, validated_data):
        user = self._create_user(validated_data)
        FarmerProfile.objects.create(
            user=user,
            phone_number=validated_data["phone_number"],
            county=validated_data["county"],
            country=validated_data.get("country") or "Kenya",
            products=validated_data.get("products") or "",
        )
        return user


class BuyerRegisterSerializer(BaseRegisterSerializer):
    phone_number = serializers.CharField(max_length=20)
    county = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100, required=False, default="Kenya")

    def create(self, validated_data):
        user = self._create_user(validated_data)
        BuyerProfile.objects.create(
            user=user,
            phone_number=validated_data["phone_number"],
            county=validated_data["county"],
            country=validated_data.get("country") or "Kenya",
            first_name=validated_data.get("first_name") or "",
            email=validated_data["email"],
        )
        return user


class AgencyRegisterSerializer(BaseRegisterSerializer):
    agency_name = serializers.CharField(max_length=150)
    agency_type = serializers.ChoiceField(
        choices=AgencyProfile.AGENCY_TYPE_CHOICES, default="agrovet"
    )
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    county = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def create(self, validated_data):
        user = self._create_user(validated_data)
        AgencyProfile.objects.create(
            user=user,
            agency_name=validated_data["agency_name"],
            agency_type=validated_data.get("agency_type") or "agrovet",
            phone=validated_data.get("phone") or "",
            county=validated_data.get("county") or "",
        )
        return user


class LenderRegisterSerializer(BaseRegisterSerializer):
    organization_name = serializers.CharField(max_length=200)
    organization_type = serializers.ChoiceField(
        choices=LendingPartnerProfile.ORG_TYPE_CHOICES, default="other"
    )
    registration_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    contact_phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True, default=""
    )
    county = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    website = serializers.URLField(required=False, allow_blank=True, default="")

    def create(self, validated_data):
        user = self._create_user(validated_data)
        LendingPartnerProfile.objects.create(
            user=user,
            organization_name=validated_data["organization_name"],
            organization_type=validated_data.get("organization_type") or "other",
            registration_number=validated_data.get("registration_number") or "",
            contact_phone=validated_data.get("contact_phone") or "",
            county=validated_data.get("county") or "",
            website=validated_data.get("website") or "",
            verification_status="pending",
        )
        return user


class MeUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=30)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=30)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    county = serializers.CharField(required=False, allow_blank=True, max_length=100)
    country = serializers.CharField(required=False, allow_blank=True, max_length=100)
    products = serializers.CharField(required=False, allow_blank=True)
    agency_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    agency_type = serializers.ChoiceField(
        choices=AgencyProfile.AGENCY_TYPE_CHOICES, required=False
    )
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)


class LendingAPIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = LendingAPIKey
        fields = (
            "id",
            "name",
            "key_prefix",
            "is_active",
            "last_used_at",
            "created_at",
            "expires_at",
        )
        read_only_fields = fields


class LendingAPIKeyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, default="Default")
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class LendingAPIUsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LendingAPIUsageLog
        fields = ("id", "http_status", "phone_queried_hash", "created_at", "api_key")
        read_only_fields = fields


class AdminLenderSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)

    class Meta:
        model = LendingPartnerProfile
        fields = (
            "id",
            "user",
            "organization_name",
            "organization_type",
            "registration_number",
            "contact_phone",
            "county",
            "website",
            "verification_status",
            "verified_at",
            "created_at",
        )


class MpesaTopupSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    phone_number = serializers.CharField(max_length=20)
