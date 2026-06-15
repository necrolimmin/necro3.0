from django.urls import path

from . import views

urlpatterns = [
    path("auth/register", views.register),
    path("auth/login", views.login),
    path("auth/refresh", views.refresh),
    path("media/", views.list_media),
    path("media/featured", views.featured_media),
    path("media/continue-watching", views.continue_watching),
    path("media/upload", views.upload_media),
    path("media/<uuid:media_id>", views.get_media),
    path("media/<uuid:media_id>/stream", views.stream_media),
    path("media/<uuid:media_id>/progress", views.update_progress),
    path("search/", views.search),
    path("search/tmdb", views.tmdb_search),
    path("favorites/", views.favorites),
    path("favorites/<uuid:media_id>", views.favorite_item),
    path("watchlist/", views.watchlist),
    path("watchlist/<uuid:media_id>", views.watchlist_item),
    path("profiles/", views.profiles),
    path("profiles/<uuid:profile_id>", views.delete_profile),
    path("admin/stats", views.admin_stats),
    path("admin/users", views.admin_users),
    path("admin/users/<uuid:user_id>/toggle", views.toggle_user),
    path("admin/media", views.admin_media),
    path("admin/media/<uuid:media_id>/update", views.update_admin_media),
    path("admin/media/<uuid:media_id>/episodes", views.add_admin_episode),
    path("admin/episodes/<uuid:episode_id>", views.delete_admin_episode),
    path("admin/media/<uuid:media_id>", views.delete_media),
]

