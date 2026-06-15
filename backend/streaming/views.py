import base64
import hashlib
import hmac
import json
import threading
from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt

from .models import Episode, Favorite, Genre, Media, Season, UserProfile, WatchProgress, Watchlist
from .tmdb import apply_tmdb_metadata, search_tmdb
from .transcode import process_episode_hls, process_media_hls

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



def request_value(request, name):
    return request.GET.get(name) or request.POST.get(name)


def parse_int(value, default=None, minimum=None, maximum=None):
    if value in (None, "", "undefined"):
        return default
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return default
    if minimum is not None:
        number = max(minimum, number)
    if maximum is not None:
        number = min(maximum, number)
    return number


def parse_float(value, default=None, minimum=None, maximum=None):
    if value in (None, "", "undefined"):
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if minimum is not None:
        number = max(minimum, number)
    if maximum is not None:
        number = min(maximum, number)
    return number


def parse_date(value):
    if value in (None, "", "undefined"):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        if value.isdigit() and len(value) == 4:
            return date(int(value), 1, 1)
    return None


def genre_items(raw):
    items = []
    for name in (raw or "").split(","):
        clean = name.strip()
        if not clean:
            continue
        slug = slugify(clean) or clean.lower().replace(" ", "-")
        genre, _ = Genre.objects.get_or_create(slug=slug, defaults={"name": clean})
        items.append(genre)
    return items
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


def primary_profile(user):
    profile = user.profiles.first()
    if profile:
        return profile
    return UserProfile.objects.create(user=user, name=user.username or user.email.split("@")[0])


def media_poster_url(media):
    if media.poster:
        return media.poster.url
    return media.poster_url


def media_backdrop_url(media):
    if getattr(media, "backdrop", None):
        return media.backdrop.url
    return media.backdrop_url


def absolute_media_url(request, url):
    if url and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def absolute_media_poster_url(request, media):
    return absolute_media_url(request, media_poster_url(media))


def absolute_media_backdrop_url(request, media):
    return absolute_media_url(request, media_backdrop_url(media))


def admin_episode_payload(episode):
    return {
        "id": str(episode.id),
        "season_id": str(episode.season_id),
        "season_number": episode.season.season_number,
        "episode_number": episode.episode_number,
        "title": episode.title,
        "description": episode.description,
        "runtime": episode.runtime,
        "air_date": episode.air_date.isoformat() if episode.air_date else None,
        "thumbnail_url": episode.thumbnail_url,
        "status": episode.status,
        "has_file": bool(episode.file),
        "hls_path": episode.hls_path,
    }


def admin_season_payload(season):
    return {
        "id": str(season.id),
        "season_number": season.season_number,
        "name": season.name,
        "episodes": [admin_episode_payload(episode) for episode in season.episodes.all()],
    }
def media_payload(media, watch_percentage=None, request=None):
    in_watchlist = False
    in_favorite = False
    if request is not None and hasattr(request, "nova_user"):
        profile = primary_profile(request.nova_user)
        in_watchlist = Watchlist.objects.filter(profile=profile, media=media).exists()
        in_favorite = Favorite.objects.filter(profile=profile, media=media).exists()
    return {
        "in_watchlist": in_watchlist,
        "in_favorite": in_favorite,
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
        "backdrop_url": absolute_media_backdrop_url(request, media) if request else media_backdrop_url(media),
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
    sort = request.GET.get("sort")
    allowed_sorts = {"-created_at", "created_at", "-rating", "rating", "title", "-title"}
    if sort in allowed_sorts:
        if sort in {"-rating", "rating"}:
            qs = qs.order_by(sort, "-created_at")
        else:
            qs = qs.order_by(sort)
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
            return response({"hls_url": hls_url, "type": "episode", "qualities": ["auto", "480p", "720p", "1080p"]})
        if episode.file:
            url = request.build_absolute_uri(episode.file.url)
            return response({"hls_url": url, "url": url, "type": "episode"})
    if media.hls_path:
        hls_url = request.build_absolute_uri(f"/hls/{media.hls_path}/master.m3u8")
        return response({"hls_url": hls_url, "type": "movie", "qualities": ["auto", "480p", "720p", "1080p"]})
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
    backdrop = request.FILES.get("backdrop")
    title = request_value(request, "title")
    media_type = request_value(request, "type") or "movie"
    tmdb_id = request_value(request, "tmdb_id")
    description = request_value(request, "description")
    release_date = parse_date(request_value(request, "release_date"))
    runtime = parse_int(request_value(request, "runtime"), minimum=1)
    rating = parse_float(request_value(request, "rating"), minimum=0, maximum=10)
    genres = genre_items(request_value(request, "genres"))
    if media_type not in dict(Media.Type.choices):
        media_type = Media.Type.MOVIE
    if not upload or not title:
        return response({"detail": "file and title are required"}, 400)
    media = Media.objects.create(
        title=title.strip(),
        type=media_type,
        description=(description or "").strip() or None,
        release_date=release_date,
        runtime=runtime,
        rating=rating,
        file=upload,
        poster=poster,
        backdrop=backdrop,
        file_size=upload.size,
        status=Media.Status.PROCESSING if settings.HLS_AUTO_TRANSCODE else Media.Status.READY,
    )
    if tmdb_id:
        try:
            apply_tmdb_metadata(media, int(tmdb_id))
        except Exception:
            pass
    if genres:
        media.genres.set(genres)
    if settings.HLS_AUTO_TRANSCODE:
        threading.Thread(target=process_media_hls, args=(media.id,), daemon=True).start()
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
def favorites(request):
    if request.method == "GET":
        profile = primary_profile(request.nova_user)
        rows = Favorite.objects.select_related("media").filter(profile=profile).order_by("-added_at")
        return response([media_payload(row.media, request=request) for row in rows])
    if request.method == "POST":
        media_id = body_json(request).get("media_id") or request.POST.get("media_id")
        if not media_id:
            return response({"detail": "media_id is required"}, 400)
        media = get_object_or_404(Media, id=media_id, is_active=True)
        profile = primary_profile(request.nova_user)
        Favorite.objects.get_or_create(profile=profile, media=media)
        return response({"in_favorite": True, "media_id": str(media.id)}, 201)
    return response({"detail": "Method not allowed"}, 405)


@login_required
def favorite_item(request, media_id):
    media = get_object_or_404(Media, id=media_id, is_active=True)
    profile = primary_profile(request.nova_user)
    if request.method == "GET":
        return response({"in_favorite": Favorite.objects.filter(profile=profile, media=media).exists()})
    if request.method == "POST":
        Favorite.objects.get_or_create(profile=profile, media=media)
        return response({"in_favorite": True, "media_id": str(media.id)}, 201)
    if request.method == "DELETE":
        Favorite.objects.filter(profile=profile, media=media).delete()
        return response({"in_favorite": False, "media_id": str(media.id)})
    return response({"detail": "Method not allowed"}, 405)
@login_required
def watchlist(request):
    if request.method == "GET":
        profile = primary_profile(request.nova_user)
        rows = Watchlist.objects.select_related("media").filter(profile=profile).order_by("-added_at")
        return response([media_payload(row.media, request=request) for row in rows])
    if request.method == "POST":
        media_id = body_json(request).get("media_id") or request.POST.get("media_id")
        if not media_id:
            return response({"detail": "media_id is required"}, 400)
        media = get_object_or_404(Media, id=media_id, is_active=True)
        profile = primary_profile(request.nova_user)
        Watchlist.objects.get_or_create(profile=profile, media=media)
        return response({"in_watchlist": True, "media_id": str(media.id)}, 201)
    return response({"detail": "Method not allowed"}, 405)


@login_required
def watchlist_item(request, media_id):
    media = get_object_or_404(Media, id=media_id, is_active=True)
    profile = primary_profile(request.nova_user)
    if request.method == "GET":
        return response({"in_watchlist": Watchlist.objects.filter(profile=profile, media=media).exists()})
    if request.method == "POST":
        Watchlist.objects.get_or_create(profile=profile, media=media)
        return response({"in_watchlist": True, "media_id": str(media.id)}, 201)
    if request.method == "DELETE":
        Watchlist.objects.filter(profile=profile, media=media).delete()
        return response({"in_watchlist": False, "media_id": str(media.id)})
    return response({"detail": "Method not allowed"}, 405)
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
    queryset = Media.objects.prefetch_related("genres", "seasons__episodes").order_by("-created_at")
    return response([{
        "id": str(item.id),
        "title": item.title,
        "type": item.type,
        "description": item.description,
        "status": item.status,
        "poster_url": absolute_media_poster_url(request, item),
        "poster_position_x": item.poster_position_x,
        "poster_position_y": item.poster_position_y,
        "backdrop_url": absolute_media_backdrop_url(request, item),
        "genres": [genre.name for genre in item.genres.all()],
        "seasons": [admin_season_payload(season) for season in item.seasons.all()],
        "is_featured": item.is_featured,
        "created_at": item.created_at.isoformat(),
    } for item in queryset])

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
    backdrop = request.FILES.get("backdrop")
    genres = genre_items(request.POST.get("genres"))

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
    if backdrop:
        media.backdrop = backdrop
    media.save()
    media.genres.set(genres)

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
            "backdrop_url": absolute_media_backdrop_url(request, media),
            "genres": [genre.name for genre in media.genres.all()],
            "is_featured": media.is_featured,
        },
    })


@login_required
def add_admin_episode(request, media_id):
    if denied := method_allowed(request, ["POST"]):
        return denied
    if denied := require_admin(request):
        return denied
    media = get_object_or_404(Media, id=media_id)
    if media.type not in {Media.Type.SERIES, Media.Type.ANIME}:
        return response({"detail": "Episodes can be added only to series or anime"}, 400)

    upload = request.FILES.get("file")
    season_number = parse_int(request.POST.get("season_number"), default=1, minimum=1)
    episode_number = parse_int(request.POST.get("episode_number"), minimum=1)
    title = (request.POST.get("title") or "").strip()
    description = (request.POST.get("description") or "").strip()
    runtime = parse_int(request.POST.get("runtime"), minimum=1)
    air_date = parse_date(request.POST.get("air_date"))

    if not upload or not episode_number or not title:
        return response({"detail": "file, title, and episode_number are required"}, 400)

    season, _ = Season.objects.get_or_create(
        media=media,
        season_number=season_number,
        defaults={"name": f"Season {season_number}"},
    )
    episode = Episode.objects.create(
        season=season,
        episode_number=episode_number,
        title=title,
        description=description or None,
        runtime=runtime,
        air_date=air_date,
        file=upload,
        status=Media.Status.PROCESSING if settings.HLS_AUTO_TRANSCODE else Media.Status.READY,
    )
    if settings.HLS_AUTO_TRANSCODE:
        threading.Thread(target=process_episode_hls, args=(episode.id,), daemon=True).start()
    return response({"episode": admin_episode_payload(episode), "message": "Episode uploaded"}, 201)


@login_required
def delete_admin_episode(request, episode_id):
    if denied := method_allowed(request, ["DELETE"]):
        return denied
    if denied := require_admin(request):
        return denied
    episode = get_object_or_404(Episode, id=episode_id)
    episode.delete()
    return response({"deleted": True})

@login_required
def delete_media(request, media_id):
    if denied := method_allowed(request, ["DELETE"]):
        return denied
    if denied := require_admin(request):
        return denied
    media = get_object_or_404(Media, id=media_id)
    media.delete()
    return response({"deleted": True})








