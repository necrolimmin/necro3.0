import base64
import hashlib
import hmac
import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Episode, Media, UserProfile, WatchProgress
from .tmdb import apply_tmdb_metadata, search_tmdb

User = get_user_model()


def body_json(request):
    if request.content_type and "application/json" in request.content_type:
        try:
            return json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return {}
    return request.POST.dict()


def response(data, status=200):
    return JsonResponse(data, status=status, safe=not isinstance(data, list))


def method_allowed(request, methods):
    if request.method not in methods:
        return response({"detail": "Method not allowed"}, 405)
    return None


def b64url_encode(value):
    if isinstance(value, str):
        value = value.encode("utf-8")
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def b64url_decode(value):
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def signed_token(user, token_type):
    lifetime = (
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        if token_type == "refresh"
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "type": token_type,
        "exp": (timezone.now() + lifetime).timestamp(),
    }
    header_part = b64url_encode(json.dumps(header, separators=(",", ":")))
    payload_part = b64url_encode(json.dumps(payload, separators=(",", ":")))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{b64url_encode(signature)}"


def decode_token(token, expected_type="access"):
    try:
        header_part, payload_part, signature_part = token.split(".")
        signing_input = f"{header_part}.{payload_part}".encode("ascii")
        expected_signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(b64url_decode(signature_part), expected_signature):
            return None
        payload = json.loads(b64url_decode(payload_part).decode("utf-8"))
    except Exception:
        return None
    if payload.get("type") != expected_type or payload.get("exp", 0) < timezone.now().timestamp():
        return None
    return payload


def token_response(user):
    return {
        "access_token": signed_token(user, "access"),
        "refresh_token": signed_token(user, "refresh"),
        "token_type": "bearer",
    }


def current_user(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    payload = decode_token(auth.removeprefix("Bearer ").strip())
    if not payload:
        return None
    try:
        return User.objects.get(id=payload["sub"], is_active=True)
    except User.DoesNotExist:
        return None


def login_required(view):
    def wrapped(request, *args, **kwargs):
        user = current_user(request)
        if not user:
            return response({"detail": "Invalid token"}, 401)
        request.nova_user = user
        return view(request, *args, **kwargs)

    return csrf_exempt(wrapped)


def is_admin(user):
    return getattr(user, "is_nova_admin", False)


def require_admin(request):
    if not is_admin(request.nova_user):
        return response({"detail": "Admin access required"}, 403)
    return None


def media_poster_url(media):
    if media.poster:
        return media.poster.url
    return media.poster_url


def absolute_media_poster_url(request, media):
    url = media_poster_url(media)
    if url and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def media_payload(media, watch_percentage=None, request=None):
    return {
        "id": str(media.id),
        "title": media.title,
        "type": media.type,
        "status": media.status,
        "description": media.description,
        "release_date": media.release_date.isoformat() if media.release_date else None,
        "runtime": media.runtime,
        "rating": media.rating,
        "poster_url": absolute_media_poster_url(request, media) if request else media_poster_url(media),
        "poster_position_x": media.poster_position_x,
        "poster_position_y": media.poster_position_y,
        "backdrop_url": media.backdrop_url,
        "logo_url": media.logo_url,
        "is_featured": media.is_featured,
        "genres": [genre.name for genre in media.genres.all()],
        "watch_percentage": watch_percentage,
    }


@csrf_exempt
def register(request):
    if denied := method_allowed(request, ["POST"]):
        return denied
    data = body_json(request)
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not email or not username or not password:
        return response({"detail": "email, username and password are required"}, 400)
    if User.objects.filter(Q(email=email) | Q(username=username)).exists():
        return response({"detail": "Email or username already exists"}, 400)
    user = User.objects.create_user(username=username, email=email, password=password, is_verified=True)
    UserProfile.objects.create(user=user, name=username)
    return response({"message": "Account created successfully", "user_id": str(user.id)}, 201)


@csrf_exempt
def login(request):
    if denied := method_allowed(request, ["POST"]):
        return denied
    data = body_json(request)
    username = data.get("username")
    password = data.get("password")
    user = authenticate(request, username=username, password=password)
    if user is None:
        try:
            candidate = User.objects.get(email=username)
            user = authenticate(request, username=candidate.username, password=password)
        except User.DoesNotExist:
            user = None
    if user is None:
        return response({"detail": "Invalid credentials"}, 401)
    if not user.is_active:
        return response({"detail": "Account disabled"}, 403)
    return response(token_response(user))


@csrf_exempt
def refresh(request):
    if denied := method_allowed(request, ["POST"]):
        return denied
    token = body_json(request).get("refresh_token")
    payload = decode_token(token, "refresh") if token else None
    if not payload:
        return response({"detail": "Invalid refresh token"}, 401)
    try:
        user = User.objects.get(id=payload["sub"], is_active=True)
    except User.DoesNotExist:
        return response({"detail": "User not found"}, 401)
    return response(token_response(user))


@login_required
def list_media(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    page = max(int(request.GET.get("page", 1)), 1)
    limit = min(max(int(request.GET.get("limit", 20)), 1), 100)
    qs = Media.objects.prefetch_related("genres").filter(is_active=True, status=Media.Status.READY)
    if request.GET.get("type"):
        qs = qs.filter(type=request.GET["type"])
    if request.GET.get("search"):
        qs = qs.filter(Q(title__icontains=request.GET["search"]) | Q(description__icontains=request.GET["search"]))
    if request.GET.get("genre"):
        qs = qs.filter(genres__slug=request.GET["genre"])
    total = qs.count()
    start = (page - 1) * limit
    return response({"total": total, "page": page, "limit": limit, "items": [media_payload(item, request=request) for item in qs[start:start + limit]]})


@login_required
def featured_media(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    qs = Media.objects.prefetch_related("genres").filter(is_featured=True, is_active=True, status=Media.Status.READY)[:5]
    return response([media_payload(item, request=request) for item in qs])


@login_required
def continue_watching(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    rows = WatchProgress.objects.select_related("media").prefetch_related("media__genres").filter(
        user=request.nova_user, percentage__gte=5, percentage__lte=90
    ).order_by("-updated_at")[:20]
    return response([media_payload(row.media, row.percentage, request=request) for row in rows])


@login_required
def get_media(request, media_id):
    if denied := method_allowed(request, ["GET"]):
        return denied
    media = get_object_or_404(Media.objects.prefetch_related("genres", "seasons__episodes", "subtitles"), id=media_id)
    data = media_payload(media, request=request)
    data["seasons"] = [{
        "id": str(season.id),
        "season_number": season.season_number,
        "name": season.name,
        "poster_url": season.poster_url,
        "episodes": [{
            "id": str(ep.id),
            "episode_number": ep.episode_number,
            "title": ep.title,
            "description": ep.description,
            "runtime": ep.runtime,
            "thumbnail_url": ep.thumbnail_url,
            "duration": ep.duration,
        } for ep in season.episodes.all()],
    } for season in media.seasons.all()]
    data["subtitles"] = [{
        "language": sub.language,
        "language_name": sub.language_name,
        "file_path": sub.file.url if sub.file else None,
        "is_default": sub.is_default,
    } for sub in media.subtitles.all()]
    return response(data)


@login_required
def stream_media(request, media_id):
    if denied := method_allowed(request, ["GET"]):
        return denied
    media = get_object_or_404(Media, id=media_id, status=Media.Status.READY)
    episode_id = request.GET.get("episode_id")
    if episode_id:
        episode = get_object_or_404(Episode, id=episode_id, season__media=media)
        if episode.hls_path:
            hls_url = request.build_absolute_uri(f"/hls/{episode.hls_path}/master.m3u8")
            return response({"hls_url": hls_url, "type": "episode"})
        if episode.file:
            url = request.build_absolute_uri(episode.file.url)
            return response({"hls_url": url, "url": url, "type": "episode"})
    if media.hls_path:
        hls_url = request.build_absolute_uri(f"/hls/{media.hls_path}/master.m3u8")
        return response({"hls_url": hls_url, "type": "movie"})
    if media.file:
        url = request.build_absolute_uri(media.file.url)
        return response({"hls_url": url, "url": url, "type": "movie"})
    return response({"detail": "Stream not available"}, 404)


@login_required
def upload_media(request):
    if denied := method_allowed(request, ["POST"]):
        return denied
    if denied := require_admin(request):
        return denied
    upload = request.FILES.get("file")
    poster = request.FILES.get("poster")
    title = request.GET.get("title") or request.POST.get("title")
    media_type = request.GET.get("type") or request.POST.get("type") or "movie"
    tmdb_id = request.GET.get("tmdb_id") or request.POST.get("tmdb_id")
    if not upload or not title:
        return response({"detail": "file and title are required"}, 400)
    media = Media.objects.create(
        title=title,
        type=media_type,
        file=upload,
        poster=poster,
        file_size=upload.size,
        status=Media.Status.READY,
    )
    if tmdb_id:
        try:
            apply_tmdb_metadata(media, int(tmdb_id))
        except Exception:
            pass
    return response({"media_id": str(media.id), "message": "Upload received"}, 202)


@login_required
def update_progress(request, media_id):
    if denied := method_allowed(request, ["PUT"]):
        return denied
    media = get_object_or_404(Media, id=media_id)
    data = body_json(request)
    position = float(request.GET.get("position") or data.get("position") or 0)
    duration_raw = request.GET.get("duration") or data.get("duration")
    duration = float(duration_raw) if duration_raw not in (None, "", "undefined") else None
    percentage = (position / duration * 100) if duration else 0
    progress, _ = WatchProgress.objects.get_or_create(user=request.nova_user, media=media)
    progress.position = position
    progress.duration = duration
    progress.percentage = percentage
    progress.completed = percentage >= 90
    progress.save()
    return response({"updated": True})


@login_required
def search(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    query = request.GET.get("q", "")
    qs = Media.objects.filter(
        Q(title__icontains=query) | Q(description__icontains=query),
        is_active=True,
        status=Media.Status.READY,
    )[:20]
    results = [{
        "id": str(item.id),
        "title": item.title,
        "type": item.type,
        "poster_url": absolute_media_poster_url(request, item),
        "poster_position_x": item.poster_position_x,
        "poster_position_y": item.poster_position_y,
        "rating": item.rating,
        "source": "local",
    } for item in qs]
    return response({"results": results, "total": len(results)})


@login_required
def tmdb_search(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    return response({"results": search_tmdb(request.GET.get("q", ""))})


@login_required
def profiles(request):
    if request.method == "GET":
        items = [{
            "id": str(profile.id),
            "name": profile.name,
            "avatar_color": profile.avatar_color,
            "avatar_url": profile.avatar_url,
            "is_kids": profile.is_kids,
        } for profile in request.nova_user.profiles.all()]
        return response(items)
    if request.method == "POST":
        if request.nova_user.profiles.count() >= 5:
            return response({"detail": "Maximum 5 profiles allowed"}, 400)
        data = body_json(request)
        profile = UserProfile.objects.create(
            user=request.nova_user,
            name=data.get("name", "Profile"),
            avatar_color=data.get("avatar_color") or "#6366f1",
            is_kids=bool(data.get("is_kids", False)),
        )
        return response({"id": str(profile.id), "name": profile.name}, 201)
    return response({"detail": "Method not allowed"}, 405)


@login_required
def delete_profile(request, profile_id):
    if denied := method_allowed(request, ["DELETE"]):
        return denied
    profile = get_object_or_404(UserProfile, id=profile_id, user=request.nova_user)
    profile.delete()
    return response({"deleted": True})


@login_required
def admin_stats(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    if denied := require_admin(request):
        return denied
    week_ago = timezone.now() - timedelta(days=7)
    return response({
        "users": {"total": User.objects.count()},
        "media": {
            "total": Media.objects.count(),
            "ready": Media.objects.filter(status=Media.Status.READY).count(),
            "processing": Media.objects.filter(status=Media.Status.PROCESSING).count(),
        },
        "activity": {"watches_this_week": WatchProgress.objects.filter(updated_at__gte=week_ago).count()},
    })


@login_required
def admin_users(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    if denied := require_admin(request):
        return denied
    return response([{
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
    } for user in User.objects.order_by("-created_at")])


@login_required
def toggle_user(request, user_id):
    if denied := method_allowed(request, ["PUT"]):
        return denied
    if denied := require_admin(request):
        return denied
    user = get_object_or_404(User, id=user_id)
    user.is_active = not user.is_active
    user.save(update_fields=["is_active"])
    return response({"is_active": user.is_active})


@login_required
def admin_media(request):
    if denied := method_allowed(request, ["GET"]):
        return denied
    if denied := require_admin(request):
        return denied
    return response([{
        "id": str(item.id),
        "title": item.title,
        "type": item.type,
        "description": item.description,
        "status": item.status,
        "poster_url": absolute_media_poster_url(request, item),
        "poster_position_x": item.poster_position_x,
        "poster_position_y": item.poster_position_y,
        "backdrop_url": item.backdrop_url,
        "is_featured": item.is_featured,
        "created_at": item.created_at.isoformat(),
    } for item in Media.objects.order_by("-created_at")])


@login_required
def update_admin_media(request, media_id):
    if denied := method_allowed(request, ["POST"]):
        return denied
    if denied := require_admin(request):
        return denied
    media = get_object_or_404(Media, id=media_id)
    title = request.POST.get("title")
    media_type = request.POST.get("type")
    description = request.POST.get("description")
    is_featured = request.POST.get("is_featured")
    poster_position_x = request.POST.get("poster_position_x")
    poster_position_y = request.POST.get("poster_position_y")
    poster = request.FILES.get("poster")

    if title is not None:
        media.title = title.strip() or media.title
    if media_type in dict(Media.Type.choices):
        media.type = media_type
    if description is not None:
        media.description = description.strip() or None
    if is_featured is not None:
        media.is_featured = is_featured in {"1", "true", "True", "yes", "on"}
    if poster_position_x is not None:
        media.poster_position_x = max(0, min(100, int(float(poster_position_x))))
    if poster_position_y is not None:
        media.poster_position_y = max(0, min(100, int(float(poster_position_y))))
    if poster:
        media.poster = poster
        media.poster_url = media.poster_url if not media.poster_url else media.poster_url
    media.save()

    return response({
        "updated": True,
        "media": {
            "id": str(media.id),
            "title": media.title,
            "type": media.type,
            "description": media.description,
            "poster_url": absolute_media_poster_url(request, media),
            "poster_position_x": media.poster_position_x,
            "poster_position_y": media.poster_position_y,
            "is_featured": media.is_featured,
        },
    })


@login_required
def delete_media(request, media_id):
    if denied := method_allowed(request, ["DELETE"]):
        return denied
    if denied := require_admin(request):
        return denied
    media = get_object_or_404(Media, id=media_id)
    media.delete()
    return response({"deleted": True})
