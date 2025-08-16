import os
from pathlib import Path
from datetime import timedelta
import sys
from imagekitio import ImageKit
import firebase_admin
from firebase_admin import credentials

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Firebase Credentials
FIREBASE_CREDENTIALS = os.path.join(
    BASE_DIR, 
    "firebase", 
    "vyzio-ads-firebase-adminsdk-fbsvc-a0dc184b04.json"
)

# Initialize Firebase if not already initialized
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred)



# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-cgy*n&2z-rx$@2+u==k_ft=99!fjwilg321dcg@ruw*h*csf=z'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Application definition
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'ads',
    'corsheaders',
    'imagekit',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'vyzio_backend.urls'
AUTH_USER_MODEL = 'ads.User'

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

WSGI_APPLICATION = 'vyzio_backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


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

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Jazzmin Admin UI Customization
JAZZMIN_SETTINGS = {
    "site_title": "Vyzio Admin",
    "site_header": "Vyzio Administration",
    "site_brand": "Vyzio",
    "welcome_sign": "Welcome to the Vyzio Admin Portal",
    "search_model": "ads.Ad",
    "show_sidebar": True,
    "navigation_expanded": True,
    "icons": {
        "auth.User": "fas fa-user",
        "ads.Ad": "fas fa-ad",
        "ads.Category": "fas fa-list",
    },
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "accent": "accent-primary",
    "navbar": "navbar-white navbar-light",
    "no_navbar_border": False,
    "navbar_fixed": False,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": False,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "spacelab",
    "dark_mode_theme": "slate",
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}


# CORS Allowed Headers
CORS_ALLOW_HEADERS = (
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
)

#  Enable credentials for cross-origin sessions/cookies
CORS_ALLOW_CREDENTIALS = True

# CORS Allowed Origins (local, LocalTunnel, production)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

# Allowed Hosts for Django (backend routing whitelist)
ALLOWED_HOSTS = [
    "vyzio.pythonanywhere.com",
    "127.0.0.1",
    "localhost",
]

#  CSRF Trusted Origins (required for secure POSTs like login/signup)
CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:8000",                         # Django dev server
    "https://9e9630710f49.ngrok-free.app",           # LocalTunnel frontend
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"



REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',  
    ),
    'DEFAULT_PARSER_CLASSES': (
    'rest_framework.parsers.JSONParser',
    'rest_framework.parsers.FormParser',
    'rest_framework.parsers.MultiPartParser',
),
}



SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=6),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Increased for usability
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': 'django-insecure-w=0r#ser!x(_0+f44h&pd7d6ly)brgiy-7rv*!+tsc$bz+j5%a',
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),  
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.serializers.TokenUser',
}

RECAPTCHA_PUBLIC_KEY = "6LcycH0qAAAAANLqVtapgFnTM47ocV3uFZHU3vwF"
RECAPTCHA_PRIVATE_KEY = "6LcycH0qAAAAAPLz0epj5PFJHOc5KFoEsHnlOQtW"

IMAGEKIT_PRIVATE_KEY = 'private_WKQr1mx/uKq3FZAOesUumGjKKEc='
IMAGEKIT_PUBLIC_KEY = 'public_rhpeB8pnhxr6JJL4YMi1bVUc8Vs='
IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/ooiob6xdv'
IMAGEKIT_API = ImageKit(
    private_key=IMAGEKIT_PRIVATE_KEY,
    public_key=IMAGEKIT_PUBLIC_KEY,
    url_endpoint=IMAGEKIT_URL_ENDPOINT
)


# Stripe
STRIPE_SECRET_KEY = "sk_test_51RwhU9Eg4d2kFkAHEhqgG63HK6LzgfeanvzETKgecv5IIpnuH9Ok5LrubnTKoAT7nvjxVqCPha8k4aNrnulWlF4Y00aL3On2yc"
STRIPE_PUBLISHABLE_KEY = "pk_test_51RwhU9Eg4d2kFkAHvMoNUhVHAphA1hx9QIoGYQHYt11khLQ2Yrr8hqomQPMTSWYGPbfS6R3iBxeUEbUIhOOAnqeO00gTPNDJDP"

# Coinbase Commerce
COINBASE_COMMERCE_API_KEY = "your_coinbase_commerce_api_key"

# Orange Money
ORANGE_API_KEY = "your_orange_api_key"  
ORANGE_MERCHANT_ID = "your_orange_merchant_id"  
