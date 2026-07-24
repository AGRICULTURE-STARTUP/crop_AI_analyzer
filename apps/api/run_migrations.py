import os
import sys

# Add the project directory to sys.path
sys.path.append('/home/job/Desktop/projects/AgriScan/crop_AI_analyzer')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'AgriProject.settings')

try:
    import django
    django.setup()
    from django.core.management import call_command
    
    print("Starting migrations...")
    call_command('makemigrations', 'main_app')
    call_command('migrate')
    print("Migrations completed successfully.")
except Exception as e:
    print(f"Error: {e}")
