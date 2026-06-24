import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from streaming.models import Episode, Media
from streaming.transcode import process_episode_hls, process_media_hls


class Command(BaseCommand):
    help = "Continuously process pending media and episode HLS jobs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--poll-interval",
            type=float,
            default=5.0,
            help="Seconds to wait when the queue is empty.",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            help="Process the current queue and exit.",
        )

    def handle(self, *args, **options):
        poll_interval = max(1.0, options["poll_interval"])
        process_once = options["once"]

        recovered_media = Media.objects.filter(
            status=Media.Status.PROCESSING,
            hls_path__isnull=True,
        ).update(status=Media.Status.PENDING)
        recovered_episodes = Episode.objects.filter(
            status=Media.Status.PROCESSING,
            hls_path__isnull=True,
        ).update(status=Media.Status.PENDING)
        if recovered_media or recovered_episodes:
            self.stdout.write(
                f"Recovered {recovered_media} media and "
                f"{recovered_episodes} episode jobs."
            )

        self.stdout.write(self.style.SUCCESS("Transcode worker started."))

        while True:
            close_old_connections()
            job = self._next_job()

            if job is None:
                if process_once:
                    return
                time.sleep(poll_interval)
                continue

            kind, job_id, title = job
            self.stdout.write(f"Processing {kind} {job_id}: {title}")

            if kind == "media":
                process_media_hls(job_id)
            else:
                process_episode_hls(job_id)

            close_old_connections()

    @staticmethod
    def _next_job():
        media = (
            Media.objects.filter(
                status=Media.Status.PENDING,
                hls_path__isnull=True,
            )
            .exclude(file="")
            .order_by("created_at")
            .first()
        )
        if media:
            claimed = Media.objects.filter(
                id=media.id,
                status=Media.Status.PENDING,
            ).update(status=Media.Status.PROCESSING)
            if claimed:
                return "media", media.id, media.title

        episode = (
            Episode.objects.filter(
                status=Media.Status.PENDING,
                hls_path__isnull=True,
            )
            .exclude(file="")
            .order_by("season__media__created_at", "season__season_number", "episode_number")
            .first()
        )
        if episode:
            claimed = Episode.objects.filter(
                id=episode.id,
                status=Media.Status.PENDING,
            ).update(status=Media.Status.PROCESSING)
            if claimed:
                return "episode", episode.id, episode.title

        return None
