from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("streaming", "0004_media_backdrop"),
    ]

    operations = [
        migrations.AlterField(
            model_name="media",
            name="type",
            field=models.CharField(
                choices=[
                    ("movie", "Movie"),
                    ("series", "Series"),
                    ("documentary", "Documentary"),
                    ("anime", "Anime"),
                    ("cartoon", "Cartoon"),
                ],
                max_length=20,
            ),
        ),
    ]
