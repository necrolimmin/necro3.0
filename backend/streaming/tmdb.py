import json
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings


TMDB_IMAGE = "https://image.tmdb.org/t/p/original"


def tmdb_get(path, params):
    query = urlencode(params)
    with urlopen(f"https://api.themoviedb.org/3/{path}?{query}", timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def search_tmdb(query):
    if not settings.TMDB_API_KEY:
        return []
    payload = tmdb_get("search/multi", {"api_key": settings.TMDB_API_KEY, "query": query, "language": "ru-RU"})
    results = []
    for item in payload.get("results", [])[:20]:
        if item.get("media_type") not in {"movie", "tv"}:
            continue
        results.append({
            "tmdb_id": item.get("id"),
            "title": item.get("title") or item.get("name"),
            "type": "series" if item.get("media_type") == "tv" else "movie",
            "poster_url": f"{TMDB_IMAGE}{item['poster_path']}" if item.get("poster_path") else None,
            "backdrop_url": f"{TMDB_IMAGE}{item['backdrop_path']}" if item.get("backdrop_path") else None,
            "rating": item.get("vote_average"),
            "overview": item.get("overview"),
            "source": "tmdb",
        })
    return results


def apply_tmdb_metadata(media, tmdb_id):
    if not settings.TMDB_API_KEY or not tmdb_id:
        return media
    kind = "tv" if media.type == "series" else "movie"
    data = tmdb_get(f"{kind}/{tmdb_id}", {"api_key": settings.TMDB_API_KEY, "language": "ru-RU"})
    media.tmdb_id = tmdb_id
    media.title = data.get("title") or data.get("name") or media.title
    media.original_title = data.get("original_title") or data.get("original_name")
    media.description = data.get("overview") or media.description
    media.tagline = data.get("tagline") or media.tagline
    media.runtime = (data.get("runtime") or (data.get("episode_run_time") or [None])[0])
    media.rating = data.get("vote_average")
    media.vote_count = data.get("vote_count") or 0
    media.language = data.get("original_language") or media.language
    if data.get("poster_path") and not media.poster:
        media.poster_url = f"{TMDB_IMAGE}{data['poster_path']}"
    media.backdrop_url = f"{TMDB_IMAGE}{data['backdrop_path']}" if data.get("backdrop_path") else media.backdrop_url
    date_value = data.get("release_date") or data.get("first_air_date")
    if date_value:
        media.release_date = date_value
    media.save()
    return media
