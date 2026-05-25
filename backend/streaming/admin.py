from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Episode, Favorite, Genre, Media, Season, Subtitle, User, UserProfile, WatchProgress, Watchlist


@admin.register(User)
class NovaUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff", "created_at")
    fieldsets = UserAdmin.fieldsets + (("NovaStream", {"fields": ("role", "is_verified")}),)


admin.site.register(UserProfile)
admin.site.register(Genre)
admin.site.register(Media)
admin.site.register(Season)
admin.site.register(Episode)
admin.site.register(Subtitle)
admin.site.register(WatchProgress)
admin.site.register(Watchlist)
admin.site.register(Favorite)
