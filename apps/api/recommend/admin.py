from django.contrib import admin

from recommend.models import CropRecommendation


@admin.register(CropRecommendation)
class CropRecommendationAdmin(admin.ModelAdmin):
    list_display = ("user", "top_crop", "confidence", "location", "created_at")
    list_filter = ("top_crop",)
    search_fields = ("user__username", "location")
    readonly_fields = ("created_at",)
