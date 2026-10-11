from django.urls import path

from recommend.views import (
    AdminRecommendationStatsView,
    CropCatalogDetailView,
    CropCatalogView,
    CropRecommendationDetailView,
    CropRecommendationHistoryView,
    CropRecommendView,
    CropWeatherView,
)

urlpatterns = [
    path("recommend/", CropRecommendView.as_view(), name="crop_recommend"),
    path(
        "recommend/history/",
        CropRecommendationHistoryView.as_view(),
        name="crop_recommend_history",
    ),
    path(
        "recommend/history/<int:record_id>/",
        CropRecommendationDetailView.as_view(),
        name="crop_recommend_history_item",
    ),
    path("recommend/weather/", CropWeatherView.as_view(), name="crop_recommend_weather"),
    path("recommend/crops/", CropCatalogView.as_view(), name="crop_catalog"),
    path(
        "recommend/crops/<slug:slug>/",
        CropCatalogDetailView.as_view(),
        name="crop_catalog_detail",
    ),
    path(
        "admin/recommendations/",
        AdminRecommendationStatsView.as_view(),
        name="admin_recommendations",
    ),
]
