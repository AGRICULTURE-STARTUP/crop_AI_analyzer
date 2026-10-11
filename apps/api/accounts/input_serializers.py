from rest_framework import serializers

from accounts.models import AgencyProduct, AgencyProfile


class AgencyPublicSerializer(serializers.ModelSerializer):
    """Public agency card for farmer discovery."""

    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = AgencyProfile
        fields = (
            "id",
            "agency_name",
            "agency_type",
            "phone",
            "county",
            "product_count",
            "created_at",
        )


class AgencyProductPublicSerializer(serializers.ModelSerializer):
    """Product card with nested agency contact for farmer browse."""

    agency_id = serializers.IntegerField(source="agency.id", read_only=True)
    agency_name = serializers.CharField(source="agency.agency_name", read_only=True)
    agency_type = serializers.CharField(source="agency.agency_type", read_only=True)
    agency_phone = serializers.CharField(source="agency.phone", read_only=True)
    county = serializers.CharField(source="agency.county", read_only=True)

    class Meta:
        model = AgencyProduct
        fields = (
            "id",
            "name",
            "category",
            "description",
            "price",
            "unit",
            "image",
            "is_available",
            "agency_id",
            "agency_name",
            "agency_type",
            "agency_phone",
            "county",
            "created_at",
        )


class AgencyProductWriteSerializer(serializers.ModelSerializer):
    """Create / update payload for the owning agency."""

    class Meta:
        model = AgencyProduct
        fields = (
            "id",
            "name",
            "category",
            "description",
            "price",
            "unit",
            "image",
            "is_available",
            "is_hidden",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_hidden", "created_at", "updated_at")
        extra_kwargs = {
            "price": {"required": False, "allow_null": True},
            "image": {"required": False, "allow_null": True},
            "description": {"required": False, "allow_blank": True},
            "unit": {"required": False, "allow_blank": True},
        }

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
            if data.get("price") in ("", None):
                data["price"] = None
            # Skip empty file fields from multipart forms.
            image = data.get("image")
            if image in ("", None) or (
                hasattr(image, "size") and getattr(image, "size", None) == 0
            ):
                data.pop("image", None)
        return super().to_internal_value(data)

    def create(self, validated_data):
        agency = self.context["agency"]
        return AgencyProduct.objects.create(agency=agency, **validated_data)
