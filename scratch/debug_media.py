import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
UPLOADS_DIR = os.path.join(MEDIA_ROOT, 'uploads')

print(f"BASE_DIR: {BASE_DIR}")
print(f"MEDIA_ROOT: {MEDIA_ROOT}")
print(f"UPLOADS_DIR: {UPLOADS_DIR}")

os.makedirs(UPLOADS_DIR, exist_ok=True)
test_file = os.path.join(UPLOADS_DIR, 'test_write.txt')

try:
    with open(test_file, 'w') as f:
        f.write('test')
    print(f"Successfully wrote to {test_file}")
    print(f"File exists on disk: {os.path.exists(test_file)}")
except Exception as e:
    print(f"Failed to write: {e}")
