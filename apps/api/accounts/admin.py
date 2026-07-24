from django.contrib import admin

from accounts.models import (
    AgencyProfile,
    LendingAPIKey,
    LendingAPIUsageLog,
    LendingPartnerProfile,
)


@admin.register(AgencyProfile)
class AgencyProfileAdmin(admin.ModelAdmin):
    list_display = ("agency_name", "agency_type", "county", "user", "created_at")
    search_fields = ("agency_name", "user__username", "user__email")


@admin.register(LendingPartnerProfile)
class LendingPartnerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "organization_name",
        "organization_type",
        "verification_status",
        "county",
        "created_at",
    )
    list_filter = ("verification_status", "organization_type")
    search_fields = ("organization_name", "user__email", "registration_number")
    raw_id_fields = ("user", "verified_by")


@admin.register(LendingAPIKey)
class LendingAPIKeyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "partner",
        "key_prefix",
        "is_active",
        "last_used_at",
        "created_at",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "key_prefix", "partner__organization_name")
    readonly_fields = ("key_hash", "key_prefix", "created_at", "last_used_at")


@admin.register(LendingAPIUsageLog)
class LendingAPIUsageLogAdmin(admin.ModelAdmin):
    list_display = ("partner", "http_status", "created_at", "api_key")
    list_filter = ("http_status",)
    readonly_fields = ("phone_queried_hash", "created_at")
