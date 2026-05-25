from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok", "version": "1.0.0", "backend": "django"})


def root(_request):
    return JsonResponse({"name": "NovaStream API", "version": "1.0.0", "backend": "django"})


urlpatterns = [
    path("", root),
    path("health", health),
    path("django-admin/", admin.site.urls),
    path("api/v1/", include("streaming.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + static(settings.HLS_URL, document_root=settings.HLS_ROOT)
