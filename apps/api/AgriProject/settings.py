from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Prefer apps/api/.env, then repo-root / infra .env for monorepo local runs.
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent.parent / ".env")
load_dotenv(BASE_DIR.parent.parent / "infra" / ".env")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")
# SECURITY WARNING: don't run with debug turned on in production!

DEBUG = os.getenv("DEBUG", "False") == "True"
# Local / laptop testing: relax CORS, hosts, SSL, and throttles so the SPA
# and Capacitor WebView can hit the API without production lockdown.
DEV_ENV = os.getenv("DEV_ENV", "False").lower() in ("1", "true", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("ALLOWED_HOSTS", "*").split(",")
    if h.strip()
]
if DEV_ENV and "*" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS = list(
        {
            *ALLOWED_HOSTS,
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "10.0.2.2",  # Android emulator → host
            "[::1]",
        }
    )

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        "https://*.onrender.com,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
# Dev mode: allow any origin (Next.js, Capacitor, LAN IP) — never enable in prod.
if DEV_ENV:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = False  # incompatible with allow-all in browsers


# Security settings for production
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG and not DEV_ENV
CSRF_COOKIE_SECURE = not DEBUG and not DEV_ENV
SECURE_SSL_REDIRECT = (
    False
    if DEV_ENV
    else os.getenv("SECURE_SSL_REDIRECT", str(not DEBUG)).lower()
    in ("1", "true", "yes")
)

# Comma-separated CIDRs/IPs allowed to hit M-Pesa callback (empty = allow all).
# In production set Safaricom egress ranges; ignored when DEV_ENV=True.
MPESA_CALLBACK_ALLOWLIST = [
    ip.strip()
    for ip in os.getenv("MPESA_CALLBACK_ALLOWLIST", "").split(",")
    if ip.strip()
]

# USSD gateway secrets (set when wiring Twilio / Africa's Talking / TextSMS).
USSD_PROVIDER = os.getenv("USSD_PROVIDER", "simulate")  # simulate|africastalking|twilio|textsms
USSD_SERVICE_CODE = os.getenv("USSD_SERVICE_CODE", "*384*55#")
AFRICASTALKING_USERNAME = os.getenv("AFRICASTALKING_USERNAME", "")
AFRICASTALKING_API_KEY = os.getenv("AFRICASTALKING_API_KEY", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TEXTSMS_API_KEY = os.getenv("TEXTSMS_API_KEY", "")


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'cloudinary_storage',
    'cloudinary',
    'main_app',
    'scanner',
    'inference',
    'accounts',
]


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'AgriProject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'AgriProject.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

database_url = os.getenv("DATABASE_URL")
if database_url:
    import socket
    from urllib.parse import urlparse
    use_database_url = True
    try:
        parsed = urlparse(database_url)
        if parsed.hostname and (
            parsed.hostname == "postgres.railway.internal"
            or parsed.hostname.endswith(".internal")
        ):
            # Try to resolve the hostname to verify if we are in the internal network
            socket.gethostbyname(parsed.hostname)
    except (socket.gaierror, Exception):
        use_database_url = False

    if use_database_url:
        ssl_require = os.getenv("DB_SSL_REQUIRE", "False").lower() in (
            "1",
            "true",
            "yes",
        )
        DATABASES["default"] = dj_database_url.config(
            conn_max_age=600, ssl_require=ssl_require
        )
    else:
        import sys

        print(
            "WARNING: DATABASE_URL host could not be resolved locally. "
            "Falling back to local SQLite database.",
            file=sys.stderr,
        )

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/


STATIC_URL = "/" \
"static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = '/media/'

# Scan images always go to local filesystem (deleted after processing).
SCAN_IMAGES_ROOT = os.getenv("SCAN_IMAGES_ROOT", os.path.join(BASE_DIR, "scan_images"))

# Modern Django 5.x Storage Configuration
if os.getenv('CLOUDINARY_URL'):
    STORAGES = {
        "default": {
            "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
        },
        "scan_images": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {
                "location": SCAN_IMAGES_ROOT,
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "scan_images": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {
                "location": SCAN_IMAGES_ROOT,
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

CLOUDINARY_STORAGE = {
    'CLOUDINARY_URL': os.getenv('CLOUDINARY_URL')
}

_static_dir = BASE_DIR / "static"
STATICFILES_DIRS = [str(_static_dir)] if _static_dir.is_dir() else []

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- DRF / JWT (SPA auth bridge) ---
_THROTTLE_RATES = {
    "anon": "1000/min" if DEV_ENV else "60/min",
    "user": "2000/min" if DEV_ENV else "120/min",
    "scans": "100/min" if DEV_ENV else "5/min",
    "chat": "100/min" if DEV_ENV else "5/min",
    "auth": "200/min" if DEV_ENV else "10/min",
    "ussd": "200/min" if DEV_ENV else "30/min",
    "lending_score": "200/min" if DEV_ENV else "30/min",
    "weather": "200/min" if DEV_ENV else "10/min",
    "payments": "100/min" if DEV_ENV else "3/min",
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.IdleTimeoutJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        []
        if DEV_ENV
        else (
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
            "rest_framework.throttling.ScopedRateThrottle",
        )
    ),
    "DEFAULT_THROTTLE_RATES": _THROTTLE_RATES,
}

# Cache: Redis when available (Compose), else local memory for laptop runs.
_redis_cache_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
# Cache: LocMem in DEV_ENV (no Redis required on laptop); Redis in Compose/prod.
if DEV_ENV or os.getenv("USE_LOCMEM_CACHE", "").lower() in ("1", "true", "yes"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "agriscan-local",
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_cache_url,
            "KEY_PREFIX": "agriscan",
        }
    }

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# --- Celery / Redis ---
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/1")
CELERY_TASK_TRACK_STARTED = True
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TASK_ROUTES = {
    "inference.run_scan_job": {"queue": "scan"},
}
CELERY_TASK_DEFAULT_QUEUE = "celery"

# Inference knobs (Contabo 8 GB defaults)
MAX_LOADED_CROP_MODELS = int(os.getenv("MAX_LOADED_CROP_MODELS", "2"))
RERANKER_ENABLED = os.getenv("RERANKER_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
)
MODELS_DIR = os.getenv("MODELS_DIR", str(BASE_DIR / "main_app" / "CropModels"))
MAX_QUEUED_SCAN_JOBS = int(os.getenv("MAX_QUEUED_SCAN_JOBS", "20"))
ALLOW_LEGACY_PARTNER_KEYS = os.getenv(
    "ALLOW_LEGACY_PARTNER_KEYS", "false"
).lower() in ("1", "true", "yes")

# Email settings for development

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "key": ""
        }
    }
}


SITE_ID = 1
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

# Session Management
SESSION_COOKIE_AGE = int(os.getenv("SESSION_IDLE_TIMEOUT_SECONDS", "1800"))
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True

# Allauth Settings
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'username_email'
ACCOUNT_EMAIL_VERIFICATION = 'none' # For simplicity in this demo
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_QUERY_EMAIL = True
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
SOCIALACCOUNT_ADAPTER = 'main_app.adapters.CustomSocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = False


EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("SENDGRID_API_KEY")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")

EMAIL_BACKEND = "sendgrid_backend.SendgridBackend"
# Load your credentials from environment variables
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
# The email address that emails will appear to come from
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL")
# Toggle sandbox mode based on your environment
# If True, emails will NOT actually be sent (good for local testing)
SENDGRID_SANDBOX_MODE_IN_DEBUG = False
# Optional: Disable click tracking if you want clean URLs in your emails
SENDGRID_TRACK_CLICKS_PLAIN = False

# Tavily API Key for search functionality
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Production Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}
