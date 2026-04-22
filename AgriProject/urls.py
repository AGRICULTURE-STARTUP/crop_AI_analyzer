from django.contrib import admin
from django.urls import path,include,re_path
from django.conf import settings
from django.views.static import serve

from django.views.generic.base import RedirectView

urlpatterns = [
    #path('admin/', admin.site.urls),
    path('', include('main_app.urls')),
    path('accounts/', include('allauth.urls')),
    path('favicon.ico', RedirectView.as_view(url='/static/images/agriscan_favicon.png')),
]

if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
