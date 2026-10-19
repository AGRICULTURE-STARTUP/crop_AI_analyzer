"""Deactivate buyer-only accounts and drop BuyerProfile / MarketConnection."""

from django.db import migrations


def deactivate_buyer_only_users(apps, schema_editor):
    BuyerProfile = apps.get_model("main_app", "BuyerProfile")
    FarmerProfile = apps.get_model("main_app", "FarmerProfile")
    User = apps.get_model("auth", "User")

    buyer_user_ids = list(BuyerProfile.objects.values_list("user_id", flat=True))
    if not buyer_user_ids:
        return

    farmer_user_ids = set(
        FarmerProfile.objects.filter(user_id__in=buyer_user_ids).values_list(
            "user_id", flat=True
        )
    )

    # Users who also have another role keep their account; buyer profile is dropped later.
    # Buyer-only users (no farmer profile, not staff) are deactivated.
    User.objects.filter(id__in=buyer_user_ids).exclude(
        id__in=farmer_user_ids
    ).exclude(is_staff=True).update(is_active=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("main_app", "0015_buyerprofile_photo"),
    ]

    operations = [
        migrations.RunPython(deactivate_buyer_only_users, noop_reverse),
        migrations.DeleteModel(name="MarketConnection"),
        migrations.DeleteModel(name="BuyerProfile"),
    ]
