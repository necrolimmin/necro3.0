import json
import logging
import shutil
import subprocess
from pathlib import Path

from django.conf import settings

from .models import Episode, Media


logger = logging.getLogger(__name__)

HLS_VARIANTS = [
    {"label": "480p", "height": 480, "bandwidth": 1400000, "video_bitrate": "1200k", "audio_bitrate": "128k"},
    {"label": "720p", "height": 720, "bandwidth": 2800000, "video_bitrate": "2500k", "audio_bitrate": "128k"},
    {"label": "1080p", "height": 1080, "bandwidth": 5000000, "video_bitrate": "4500k", "audio_bitrate": "160k"},
]


def tool_path(name, configured):
    return configured or shutil.which(name)


def source_dimensions(input_path):
    ffprobe = tool_path("ffprobe", getattr(settings, "FFPROBE_PATH", ""))
    if not ffprobe:
        return None
    try:
        result = subprocess.run(
            [
                ffprobe,
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "json",
                str(input_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        data = json.loads(result.stdout or "{}")
        streams = data.get("streams") or []
        if not streams:
            return None
        stream = streams[0]
        return int(stream.get("width")), int(stream.get("height"))
    except Exception:
        return None


def available_variants(input_path):
    dimensions = source_dimensions(input_path)
    if not dimensions:
        return HLS_VARIANTS
    source_width, source_height = dimensions
    variants = [variant for variant in HLS_VARIANTS if variant["height"] <= source_height]
    if not variants:
        height = max(2, source_height - (source_height % 2))
        return [{
            **HLS_VARIANTS[0],
            "label": f"{height}p",
            "height": height,
            "width": max(2, source_width - (source_width % 2)),
        }]
    prepared = []
    for variant in variants:
        width = round(source_width * (variant["height"] / source_height))
        width = max(2, width - (width % 2))
        prepared.append({**variant, "width": width})
    return prepared


def write_master_playlist(output_dir, variants):
    lines = ["#EXTM3U", "#EXT-X-VERSION:3"]
    for variant in variants:
        width = variant.get("width", 1920)
        lines.append(
            f"#EXT-X-STREAM-INF:BANDWIDTH={variant['bandwidth']},RESOLUTION={width}x{variant['height']},NAME=\"{variant['label']}\""
        )
        lines.append(f"{variant['label']}/index.m3u8")
    (output_dir / "master.m3u8").write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_variant(ffmpeg, input_path, output_dir, variant):
    variant_dir = output_dir / variant["label"]
    variant_dir.mkdir(parents=True, exist_ok=True)
    segment_pattern = variant_dir / "%05d.ts"
    playlist_path = variant_dir / "index.m3u8"
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i", str(input_path),
            "-vf", f"scale=-2:{variant['height']}",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-maxrate", variant["video_bitrate"],
            "-bufsize", str(int(variant["bandwidth"]) * 2),
            "-c:a", "aac",
            "-b:a", variant["audio_bitrate"],
            "-ac", "2",
            "-f", "hls",
            "-hls_time", "6",
            "-hls_playlist_type", "vod",
            "-hls_segment_filename", str(segment_pattern),
            str(playlist_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )


def process_media_hls(media_id):
    media = Media.objects.get(id=media_id)
    if not media.file:
        media.status = Media.Status.ERROR
        media.save(update_fields=["status"])
        return

    ffmpeg = tool_path("ffmpeg", getattr(settings, "FFMPEG_PATH", ""))
    if not ffmpeg:
        media.status = Media.Status.READY
        media.save(update_fields=["status"])
        return

    input_path = Path(media.file.path)
    output_name = f"media_{media.id}"
    output_dir = Path(settings.HLS_ROOT) / output_name
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        media.status = Media.Status.PROCESSING
        media.save(update_fields=["status"])

        variants = available_variants(input_path)
        for variant in variants:
            run_variant(ffmpeg, input_path, output_dir, variant)
        write_master_playlist(output_dir, variants)

        media.hls_path = output_name
        media.status = Media.Status.READY
        media.save(update_fields=["hls_path", "status"])
    except Exception:
        logger.exception("Failed to process HLS for media %s", media_id)
        media.status = Media.Status.ERROR
        media.save(update_fields=["status"])


def process_episode_hls(episode_id):
    episode = Episode.objects.select_related("season", "season__media").get(id=episode_id)
    if not episode.file:
        episode.status = Media.Status.ERROR
        episode.save(update_fields=["status"])
        return

    ffmpeg = tool_path("ffmpeg", getattr(settings, "FFMPEG_PATH", ""))
    if not ffmpeg:
        episode.status = Media.Status.READY
        episode.save(update_fields=["status"])
        return

    input_path = Path(episode.file.path)
    output_name = f"episode_{episode.id}"
    output_dir = Path(settings.HLS_ROOT) / output_name
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        episode.status = Media.Status.PROCESSING
        episode.save(update_fields=["status"])

        variants = available_variants(input_path)
        for variant in variants:
            run_variant(ffmpeg, input_path, output_dir, variant)
        write_master_playlist(output_dir, variants)

        episode.hls_path = output_name
        episode.status = Media.Status.READY
        episode.save(update_fields=["hls_path", "status"])
    except Exception:
        logger.exception("Failed to process HLS for episode %s", episode_id)
        episode.status = Media.Status.ERROR
        episode.save(update_fields=["status"])
