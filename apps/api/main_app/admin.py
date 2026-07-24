from django.contrib import admin
from .models import FarmerProfile, BuyerProfile, CropScanLog, MarketConnection, FarmHealthProfile, PartnerAPIKey

admin.site.register(FarmerProfile)
admin.site.register(BuyerProfile)

@admin.register(CropScanLog)
class CropScanLogAdmin(admin.ModelAdmin):
    list_display = ('farmer', 'crop_type', 'result', 'timestamp')
    list_filter = ('result', 'crop_type')
    search_fields = ('farmer__user__username', 'crop_type')

@admin.register(MarketConnection)
class MarketConnectionAdmin(admin.ModelAdmin):
    list_display = ('farmer', 'buyer', 'status', 'created_at')
    list_filter = ('status',)

@admin.register(FarmHealthProfile)
class FarmHealthProfileAdmin(admin.ModelAdmin):
    list_display = ('farmer', 'health_score', 'risk_tier', 'opt_in_for_lending')
    list_filter = ('risk_tier', 'opt_in_for_lending')

@admin.register(PartnerAPIKey)
class PartnerAPIKeyAdmin(admin.ModelAdmin):
    list_display = ('partner_name', 'is_active', 'created_at')
    readonly_fields = ('api_key',) # Make the API key read-only after creation in admin
