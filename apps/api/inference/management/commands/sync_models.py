"""Download, validate, and install all crop .h5 models from Hugging Face into MODELS_DIR.

Run during deployment — never at scan time.
Usage:  python manage.py sync_models
"""

from __future__ import annotations

import hashlib
import os
import shutil
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from inference.crops import SUPPORTED_SCAN_CROPS

HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"


def _is_valid_h5(path: Path) -> bool:
    try:
        with open(path, "rb") as fh:
            return fh.read(8) == HDF5_MAGIC
    except OSError:
        return False


class Command(BaseCommand):
    help = "Download and validate all crop models from Hugging Face into MODELS_DIR."

    def add_arguments(self, parser):
        parser.add_argument(
            "--models-dir",
            default=os.getenv("MODELS_DIR", str(Path(settings.BASE_DIR) / "main_app" / "CropModels")),
            help="Target directory for validated .h5 files.",
        )
        parser.add_argument(
            "--repo-id",
            default=os.getenv("HF_MODEL_REPO_ID", ""),
            help="Hugging Face repository ID (e.g. jobcode12/CropModels).",
        )
        parser.add_argument(
            "--revision",
            default=os.getenv("HF_MODEL_REVISION", "main"),
            help="Repository branch/tag/commit.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-download even if a valid local copy exists.",
        )

    def handle(self, **options):
        models_dir = Path(options["models_dir"])
        repo_id = options["repo_id"].strip()
        revision = options["revision"].strip() or "main"
        force = options["force"]

        if not repo_id:
            raise CommandError(
                "HF_MODEL_REPO_ID is empty. Set it in .env or pass --repo-id."
            )

        models_dir.mkdir(parents=True, exist_ok=True)
        token = os.getenv("HF_TOKEN", "").strip() or None

        from huggingface_hub import hf_hub_download

        ok, skipped, failed = 0, 0, []

        for crop in SUPPORTED_SCAN_CROPS:
            filename = f"{crop}.h5"
            dest = models_dir / filename

            if not force and dest.exists() and _is_valid_h5(dest):
                self.stdout.write(f"  ✓ {filename} (valid, skipped)")
                skipped += 1
                continue

            self.stdout.write(f"  ↓ Downloading {filename} from {repo_id}@{revision} …")
            try:
                staging_dir = tempfile.mkdtemp(prefix="agriscan_model_")
                staging_path = Path(staging_dir) / filename
                cached = hf_hub_download(
                    repo_id=repo_id,
                    filename=filename,
                    revision=revision,
                    token=token,
                    local_dir=staging_dir,
                    local_dir_use_symlinks=False,
                )
                cached = Path(cached)
                if not _is_valid_h5(cached):
                    header = cached.read_bytes()[:32]
                    failed.append(filename)
                    self.stderr.write(
                        f"  ✗ {filename}: invalid HDF5 (header {header!r})"
                    )
                    shutil.rmtree(staging_dir, ignore_errors=True)
                    continue

                shutil.move(str(cached), str(dest))
                shutil.rmtree(staging_dir, ignore_errors=True)
                size_mb = dest.stat().st_size / (1024 * 1024)
                self.stdout.write(f"  ✓ {filename} ({size_mb:.1f} MB)")
                ok += 1
            except Exception as exc:
                failed.append(filename)
                self.stderr.write(f"  ✗ {filename}: {exc}")

        self.stdout.write(
            f"\nSync complete: {ok} downloaded, {skipped} cached, {len(failed)} failed."
        )
        if failed:
            raise CommandError(
                f"Failed models: {', '.join(failed)}. Fix and re-run before starting the scanner."
            )
