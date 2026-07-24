from django.urls import path

from scanner.views import (
    CropListView,
    HealthView,
    ScanJobDetailView,
    ScanJobListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="api_health"),
    path("crops/", CropListView.as_view(), name="api_crops"),
    path("scans/", ScanJobListCreateView.as_view(), name="api_scans"),
    path("scans/<uuid:job_id>/", ScanJobDetailView.as_view(), name="api_scan_detail"),
]
