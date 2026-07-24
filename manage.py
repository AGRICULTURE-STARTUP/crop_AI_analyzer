#!/usr/bin/env python
"""Repo-root shim — delegates to apps/api/manage.py for monorepo convenience."""
import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parent / "apps" / "api"
sys.path.insert(0, str(API_ROOT))
os.chdir(API_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "AgriProject.settings")

if __name__ == "__main__":
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
