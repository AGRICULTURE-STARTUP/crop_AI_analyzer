import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'AgriProject.settings')
django.setup()

print(f"DEBUG: {settings.DEBUG}")
print(f"MEDIA_URL: {settings.MEDIA_URL}")
print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
print(f"MEDIA_ROOT exists: {os.path.exists(settings.MEDIA_ROOT)}")
print(f"BASE_DIR: {settings.BASE_DIR}")
