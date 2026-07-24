from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("main_app", "0013_remove_agencyprofile_user_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="farmerprofile",
            name="farm_name",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name="farmerprofile",
            name="farm_size_acres",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Total farm size in acres",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="farmerprofile",
            name="profile_photo",
            field=models.ImageField(
                blank=True, null=True, upload_to="farmer_profiles/"
            ),
        ),
    ]
