from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from django.views.generic.base import RedirectView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.serializers import (
    EmailOrUsernameTokenObtainPairSerializer,
    IdleTimeoutTokenRefreshSerializer,
)


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class IdleTimeoutTokenRefreshView(TokenRefreshView):
    serializer_class = IdleTimeoutTokenRefreshSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


urlpatterns = [
    # path('admin/', admin.site.urls),
    path("api/v1/", include("scanner.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("recommend.urls")),
    path(
        "api/v1/auth/login/",
        EmailOrUsernameTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "api/v1/auth/refresh/",
        IdleTimeoutTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("", include("main_app.urls")),
    path("accounts/", include("allauth.urls")),
    path(
        "favicon.ico",
        RedirectView.as_view(url="/static/images/ukulimabora_favicon.png"),
    ),
]

if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
