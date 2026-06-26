from django.db import migrations, models


def set_existing_playback_modes(apps, schema_editor):
    Media = apps.get_model("streaming", "Media")
    Media.objects.filter(type__in=["series", "anime"]).update(playback_mode="episodic")
    Media.objects.exclude(type__in=["series", "anime"]).update(playback_mode="standalone")


class Migration(migrations.Migration):

    dependencies = [
        ("streaming", "0006_episode_queue_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="media",
            name="playback_mode",
            field=models.CharField(
                choices=[("standalone", "Standalone"), ("episodic", "Episodic")],
                default="standalone",
                max_length=20,
            ),
        ),
        migrations.RunPython(set_existing_playback_modes, migrations.RunPython.noop),
    ]
