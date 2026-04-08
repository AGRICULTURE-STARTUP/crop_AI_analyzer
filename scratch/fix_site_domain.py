import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'AgriProject.settings')
django.setup()

from django.contrib.sites.models import Site

def fix_site():
    try:
        site = Site.objects.get(id=1)
        site.domain = 'agriscan.up.railway.app'
        site.name = 'AgriScan'
        site.save()
        print(f"Successfully updated site: {site.domain}")
    except Site.DoesNotExist:
        # If site 1 doesn't exist, create it
        site = Site.objects.create(id=1, domain='agriscan.up.railway.app', name='AgriScan')
        print(f"Created new site: {site.domain}")
    except Exception as e:
        print(f"Error updating site: {e}")

if __name__ == "__main__":
    fix_site()
