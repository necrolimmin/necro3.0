import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent


def load_env_file(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(PROJECT_DIR / ".env")
load_env_file(PROJECT_DIR / ".env.local")


def env_list(name, default):
    return [
        item.strip().strip("'").strip('"')
        for item in os.getenv(name, default).split(",")
        if item.strip()
    ]


def project_path(env_name, default):
    raw = os.getenv(env_name)
    if not raw:
        return Path(default).resolve()
    path = Path(raw.strip().strip("'").strip('"'))
    return path if path.is_absolute() else (PROJECT_DIR / path).resolve()


SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me-novastream-django")
DEBUG = os.getenv("DEBUG", "0") == "1"

ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    "cinema.bekhruz21.uz,api-cinema.bekhruz21.uz,localhost,127.0.0.1",
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "streaming",
]

MIDDLEWARE = [
    "streaming.middleware.SimpleCorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "novastream.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

WSGI_APPLICATION = "novastream.wsgi.application"
ASGI_APPLICATION = "novastream.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(project_path("SQLITE_PATH", BASE_DIR / "db.sqlite3")),
    }
}

AUTH_USER_MODEL = "streaming.User"
AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "ru"
TIME_ZONE = os.getenv("TIME_ZONE", "Asia/Tashkent")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = project_path("MEDIA_PATH", BASE_DIR / "media")

HLS_URL = "/hls/"
HLS_ROOT = project_path("HLS_PATH", BASE_DIR / "hls")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ORIGINS",
    "http://cinema.bekhruz21.uz,https://cinema.bekhruz21.uz,http://api-cinema.bekhruz21.uz,https://api-cinema.bekhruz21.uz",
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://cinema.bekhruz21.uz,https://cinema.bekhruz21.uz,http://api-cinema.bekhruz21.uz,https://api-cinema.bekhruz21.uz",
)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "")
FFPROBE_PATH = os.getenv("FFPROBE_PATH", "")
HLS_AUTO_TRANSCODE = os.getenv("HLS_AUTO_TRANSCODE", "1") == "1"
