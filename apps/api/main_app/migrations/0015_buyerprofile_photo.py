from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("main_app", "0014_farmerprofile_farm_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="buyerprofile",
            name="photo",
            field=models.ImageField(
                blank=True,
                help_text="Buyer profile photo shown on the farmer market page",
                null=True,
                upload_to="buyer_profiles/",
            ),
        ),
    ]
