from django.contrib import admin

from .models import ScanJob


@admin.register(ScanJob)
class ScanJobAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "crop", "status", "result_label", "created_at")
    list_filter = ("status", "crop")
    search_fields = ("id", "user__username", "result_label")
    readonly_fields = ("id", "created_at", "updated_at", "completed_at")
