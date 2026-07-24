from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from django.views.generic.base import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # path('admin/', admin.site.urls),
    path("api/v1/", include("scanner.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include("main_app.urls")),
    path("accounts/", include("allauth.urls")),
    path(
        "favicon.ico",
        RedirectView.as_view(url="/static/images/agriscan_favicon.png"),
    ),
]

if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
