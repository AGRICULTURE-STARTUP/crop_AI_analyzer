from django.conf import settings
from django.db import models


class CropRecommendation(models.Model):
    """One crop recommendation run by a signed-in user (anonymous runs are not stored)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="crop_recommendations",
    )
    nitrogen = models.FloatField()
    phosphorus = models.FloatField()
    potassium = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    ph = models.FloatField()
    rainfall = models.FloatField()
    location = models.CharField(max_length=120, blank=True, default="")
    top_crop = models.CharField(max_length=40, db_index=True)
    confidence = models.FloatField()
    results = models.JSONField(default=list, help_text="Top crops as [{crop, confidence}]")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.top_crop} ({self.confidence:.0%})"

    def inputs(self) -> dict:
        return {
            "N": self.nitrogen,
            "P": self.phosphorus,
            "K": self.potassium,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "ph": self.ph,
            "rainfall": self.rainfall,
        }
