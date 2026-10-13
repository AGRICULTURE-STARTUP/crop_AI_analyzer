"""Seed the agro-input marketplace with sample agencies, products and a farmer listing."""
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from accounts.models import AgencyProduct, AgencyProfile, FarmerProduct
from main_app.models import FarmerProfile


class Command(BaseCommand):
    help = "Seed the marketplace with sample agrovets, products and one farmer produce listing."

    def handle(self, *args, **options):
        agencies = [
            ("GreenLeaf Agrovet", "agrovet", "0722000001", "Nakuru", -0.303099, 36.080025),
            ("HighYield Fertiliser Co", "fertiliser", "0722000002", "Uasin Gishu", 0.514278, 35.269780),
            ("Kilimo Seed Bank", "seed", "0722000003", "Kiambu", -1.171400, 36.835600),
            ("SafeCrop Pesticides", "pesticide", "0722000004", "Meru", 0.046700, 37.655900),
        ]
        by_type = {}
        for name, atype, phone, county, lat, lon in agencies:
            email = name.lower().replace(" ", "").replace("'", "") + "@ukulimabora.co.ke"
            user, _ = User.objects.get_or_create(username=email, defaults={"email": email})
            profile, created = AgencyProfile.objects.update_or_create(
                user=user,
                defaults={
                    "agency_name": name,
                    "agency_type": atype,
                    "phone": phone,
                    "county": county,
                    "latitude": lat,
                    "longitude": lon,
                },
            )
            by_type[atype] = profile
            self.stdout.write(f"{'Created' if created else 'Exists'} agency: {name}")

        products = [
            ("DAP Fertiliser (50kg)", "fertiliser", "Diammonium phosphate for planting.", "3800", "50 kg bag", "agrovet"),
            ("CAN Fertiliser (50kg)", "fertiliser", "Calcium ammonium nitrate for top dressing.", "3200", "50 kg bag", "fertiliser"),
            ("NPK 17-17-17 (50kg)", "fertiliser", "Balanced NPK for general crop use.", "4100", "50 kg bag", "fertiliser"),
            ("H6213 Maize Seed (2kg)", "seed", "Drought-tolerant hybrid maize seed.", "650", "2 kg pack", "seed"),
            ("Rosecoco Bean Seed (1kg)", "seed", "High-yield bean seed variety.", "280", "1 kg pack", "seed"),
            ("Bestox Insecticide (1L)", "pesticide", "Broad-spectrum insecticide for maize and vegetables.", "1450", "1 litre", "pesticide"),
            ("Ridomil Gold Fungicide (500g)", "pesticide", "Systemic fungicide for late blight and rust control.", "1900", "500 g", "pesticide"),
            ("Knapsack Sprayer 16L", "equipment", "Manual knapsack sprayer for field application.", "3200", "unit", "agrovet"),
        ]
        image_source = Path(settings.BASE_DIR) / "agency_products" / "pesticide.jpeg"
        for name, cat, desc, price, unit, atype in products:
            agency = by_type[atype]
            product, created = AgencyProduct.objects.get_or_create(
                agency=agency,
                name=name,
                defaults={
                    "category": cat,
                    "description": desc,
                    "price": Decimal(price),
                    "unit": unit,
                },
            )
            if created and cat == "pesticide" and image_source.exists():
                with image_source.open("rb") as fh:
                    product.image.save("pesticide.jpeg", File(fh), save=True)
            self.stdout.write(f"{'Created' if created else 'Exists'} product: {name}")

        # One sample farmer produce listing
        fu, _ = User.objects.get_or_create(
            username="demo_farmer",
            defaults={"email": "demo_farmer@ukulimabora.co.ke", "first_name": "Demo", "last_name": "Farmer"},
        )
        fp, _ = FarmerProfile.objects.get_or_create(
            user=fu,
            defaults={"county": "Nakuru", "farm_name": "Demo Green Farm", "products": "maize, beans"},
        )
        listing, created = FarmerProduct.objects.get_or_create(
            farmer=fp,
            name="Fresh Dry Maize (90kg)",
            defaults={
                "category": "produce",
                "description": "Freshly harvested, well-dried maize from Nakuru.",
                "price": Decimal("4500"),
                "unit": "90 kg bag",
                "quantity": Decimal("20"),
            },
        )
        self.stdout.write(f"{'Created' if created else 'Exists'} farmer listing: {listing.name}")

        self.stdout.write(self.style.SUCCESS("Marketplace seed complete."))
