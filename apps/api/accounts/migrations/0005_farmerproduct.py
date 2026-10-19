from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_agencyproduct_is_hidden"),
        ("main_app", "0015_buyerprofile_photo"),
    ]

    operations = [
        migrations.CreateModel(
            name="FarmerProduct",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=150)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("produce", "Produce"),
                            ("seed", "Seed"),
                            ("other", "Other"),
                        ],
                        default="produce",
                        max_length=20,
                    ),
                ),
                ("description", models.TextField(blank=True, default="")),
                (
                    "price",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                ("unit", models.CharField(blank=True, default="", max_length=40)),
                (
                    "quantity",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                        help_text="Available quantity",
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        blank=True, null=True, upload_to="farmer_products/"
                    ),
                ),
                ("is_available", models.BooleanField(default=True)),
                ("is_hidden", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "farmer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="market_products",
                        to="main_app.farmerprofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
