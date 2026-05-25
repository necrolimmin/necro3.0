import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "User"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ["email"]

    @property
    def is_nova_admin(self):
        return self.role == self.Role.ADMIN or self.is_staff or self.is_superuser


class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="profiles")
    name = models.CharField(max_length=50)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    avatar_color = models.CharField(max_length=20, default="#6366f1")
    is_kids = models.BooleanField(default=False)
    pin = models.CharField(max_length=10, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Genre(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    def __str__(self):
        return self.name


class Media(models.Model):
    class Type(models.TextChoices):
        MOVIE = "movie", "Movie"
        SERIES = "series", "Series"
        DOCUMENTARY = "documentary", "Documentary"
        ANIME = "anime", "Anime"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500, db_index=True)
    original_title = models.CharField(max_length=500, blank=True, null=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    description = models.TextField(blank=True, null=True)
    tagline = models.CharField(max_length=500, blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    runtime = models.PositiveIntegerField(blank=True, null=True)
    rating = models.FloatField(blank=True, null=True)
    vote_count = models.PositiveIntegerField(default=0)
    tmdb_id = models.PositiveIntegerField(blank=True, null=True, unique=True)
    imdb_id = models.CharField(max_length=20, blank=True, null=True)
    language = models.CharField(max_length=10, default="en")
    age_rating = models.CharField(max_length=10, blank=True, null=True)
    poster_url = models.URLField(max_length=500, blank=True, null=True)
    poster = models.FileField(upload_to="posters/", blank=True, null=True)
    poster_position_x = models.PositiveSmallIntegerField(default=50)
    poster_position_y = models.PositiveSmallIntegerField(default=50)
    backdrop_url = models.URLField(max_length=500, blank=True, null=True)
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    file = models.FileField(upload_to="uploads/", blank=True, null=True)
    hls_path = models.CharField(max_length=1000, blank=True, null=True)
    file_size = models.PositiveBigIntegerField(blank=True, null=True)
    duration = models.FloatField(blank=True, null=True)
    resolution = models.CharField(max_length=20, blank=True, null=True)
    codec = models.CharField(max_length=50, blank=True, null=True)
    bitrate = models.PositiveIntegerField(blank=True, null=True)
    genres = models.ManyToManyField(Genre, related_name="media", blank=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class Season(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name="seasons")
    season_number = models.PositiveIntegerField()
    name = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    poster_url = models.URLField(max_length=500, blank=True, null=True)
    air_date = models.DateField(blank=True, null=True)

    class Meta:
        ordering = ["season_number"]


class Episode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="episodes")
    episode_number = models.PositiveIntegerField()
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    runtime = models.PositiveIntegerField(blank=True, null=True)
    air_date = models.DateField(blank=True, null=True)
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    file = models.FileField(upload_to="episodes/", blank=True, null=True)
    hls_path = models.CharField(max_length=1000, blank=True, null=True)
    duration = models.FloatField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Media.Status.choices, default=Media.Status.PENDING)

    class Meta:
        ordering = ["episode_number"]


class Subtitle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name="subtitles")
    language = models.CharField(max_length=10)
    language_name = models.CharField(max_length=50)
    file = models.FileField(upload_to="subtitles/")
    is_default = models.BooleanField(default=False)
    is_forced = models.BooleanField(default=False)


class WatchProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="watch_progress")
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, blank=True, null=True)
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name="watch_progress")
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, blank=True, null=True)
    position = models.FloatField(default=0)
    duration = models.FloatField(blank=True, null=True)
    percentage = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class Watchlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="watchlist")
    media = models.ForeignKey(Media, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)


class Favorite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="favorites")
    media = models.ForeignKey(Media, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
