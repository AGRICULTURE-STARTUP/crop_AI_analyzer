import math

from rest_framework import serializers


def _finite(value: float) -> float:
    if not math.isfinite(value):
        raise serializers.ValidationError("Enter a real number.")
    return value


class RecommendInputSerializer(serializers.Serializer):
    """Soil and climate values. Limits are physical sanity checks, not the training range."""

    N = serializers.FloatField(min_value=0, max_value=300, validators=[_finite])
    P = serializers.FloatField(min_value=0, max_value=300, validators=[_finite])
    K = serializers.FloatField(min_value=0, max_value=400, validators=[_finite])
    temperature = serializers.FloatField(min_value=-10, max_value=60, validators=[_finite])
    humidity = serializers.FloatField(min_value=0, max_value=100, validators=[_finite])
    ph = serializers.FloatField(min_value=0, max_value=14, validators=[_finite])
    rainfall = serializers.FloatField(min_value=0, max_value=5000, validators=[_finite])
    location = serializers.CharField(
        max_length=120, required=False, allow_blank=True, default=""
    )
