from rest_framework import serializers

from inference.crops import KNOWN_CROP_CLASSES, SUPPORTED_SCAN_CROPS
from scanner.models import ScanJob


class ScanJobCreateSerializer(serializers.Serializer):
    crop = serializers.ChoiceField(choices=[(c, c) for c in SUPPORTED_SCAN_CROPS])
    image = serializers.ImageField()

    def validate_image(self, value):
        max_bytes = 5 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        content_type = getattr(value, "content_type", "") or ""
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("File must be an image.")
        return value


class ScanJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanJob
        fields = [
            "id",
            "crop",
            "status",
            "result_label",
            "confidence",
            "report",
            "gatekeeper_passed",
            "error_message",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = fields


class CropCatalogSerializer(serializers.Serializer):
    crop = serializers.CharField()
    classes = serializers.ListField(child=serializers.CharField())
    supported = serializers.BooleanField()


def crop_catalog_payload():
    return [
        {
            "crop": crop,
            "classes": labels,
            "supported": crop in SUPPORTED_SCAN_CROPS,
        }
        for crop, labels in KNOWN_CROP_CLASSES.items()
    ]
