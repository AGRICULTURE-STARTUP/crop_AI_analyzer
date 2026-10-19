from rest_framework import serializers

from accounts.models import FarmerProduct


class FarmerProductWriteSerializer(serializers.ModelSerializer):
    """Create / update payload for the owning farmer."""

    class Meta:
        model = FarmerProduct
        fields = (
            "id",
            "name",
            "category",
            "description",
            "price",
            "unit",
            "quantity",
            "image",
            "is_available",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            "price": {"required": False, "allow_null": True},
            "quantity": {"required": False, "allow_null": True},
            "image": {"required": False, "allow_null": True},
            "description": {"required": False, "allow_blank": True},
            "unit": {"required": False, "allow_blank": True},
        }

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
            if data.get("price") in ("", None):
                data["price"] = None
            if data.get("quantity") in ("", None):
                data["quantity"] = None
            image = data.get("image")
            if image in ("", None) or (
                hasattr(image, "size") and getattr(image, "size", None) == 0
            ):
                data.pop("image", None)
        return super().to_internal_value(data)

    def create(self, validated_data):
        farmer = self.context["farmer"]
        return FarmerProduct.objects.create(farmer=farmer, **validated_data)
