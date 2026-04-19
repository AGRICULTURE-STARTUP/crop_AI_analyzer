import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'AgriProject.settings')
django.setup()

from main_app.models import AgencyProduct

products = AgencyProduct.objects.all()
print(f"Total products: {products.count()}")
for p in products:
    print(f"Product: {p.name}")
    print(f"  Image: {p.image}")
    if p.image:
        try:
            print(f"  Image URL: {p.image.url}")
            print(f"  Path exists: {os.path.exists(p.image.path)}")
        except Exception as e:
            print(f"  Error getting URL/Path: {e}")
    else:
        print("  No image associated.")
