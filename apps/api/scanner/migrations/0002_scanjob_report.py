from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="scanjob",
            name="report",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
