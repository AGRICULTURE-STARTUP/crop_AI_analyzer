"""Tests for the local scan pipeline — model provisioning, storage, and cleanup."""

import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from inference.crops import KNOWN_CROP_CLASSES, SUPPORTED_SCAN_CROPS
from inference.model_lru import HDF5_MAGIC, _is_valid_h5, resolve_model_path


# ---------------------------------------------------------------------------
# Model manifest completeness
# ---------------------------------------------------------------------------
class CropManifestTests(unittest.TestCase):
    def test_all_supported_crops_have_class_labels(self):
        for crop in SUPPORTED_SCAN_CROPS:
            self.assertIn(crop, KNOWN_CROP_CLASSES, f"{crop} missing from KNOWN_CROP_CLASSES")
            self.assertGreater(len(KNOWN_CROP_CLASSES[crop]), 0)

    def test_exactly_18_supported_crops(self):
        self.assertEqual(len(SUPPORTED_SCAN_CROPS), 18)

    def test_supported_crops_are_sorted(self):
        self.assertEqual(SUPPORTED_SCAN_CROPS, sorted(SUPPORTED_SCAN_CROPS))


# ---------------------------------------------------------------------------
# HDF5 validation
# ---------------------------------------------------------------------------
class HDF5ValidationTests(unittest.TestCase):
    @staticmethod
    def _tmp_h5(payload: bytes) -> Path:
        """Write a temp .h5 in a closed handle.

        h5py keeps the file mapped, so unlinking inside the `with` block fails
        on Windows; close the file before validating and cleaning up.
        """
        fd, name = tempfile.mkstemp(suffix=".h5")
        with os.fdopen(fd, "wb") as fh:
            fh.write(payload)
        return Path(name)

    def test_valid_h5_header(self):
        path = self._tmp_h5(HDF5_MAGIC + b"\x00" * 100)
        try:
            self.assertTrue(_is_valid_h5(path))
        finally:
            path.unlink(missing_ok=True)

    def test_invalid_h5_header(self):
        path = self._tmp_h5(b"version https://git-lfs.github.com/spec/v1\n")
        try:
            self.assertFalse(_is_valid_h5(path))
        finally:
            path.unlink(missing_ok=True)

    def test_missing_file(self):
        self.assertFalse(_is_valid_h5(Path("/nonexistent/model.h5")))


# ---------------------------------------------------------------------------
# Local-only model resolution
# ---------------------------------------------------------------------------
class ResolveModelPathTests(unittest.TestCase):
    def test_finds_valid_local_model(self):
        with tempfile.TemporaryDirectory() as d:
            model_file = Path(d) / "beans.h5"
            model_file.write_bytes(HDF5_MAGIC + b"\x00" * 100)
            with patch.dict(os.environ, {"MODELS_DIR": d}):
                result = resolve_model_path("beans")
                self.assertEqual(result, str(model_file))

    def test_skips_corrupt_model(self):
        with tempfile.TemporaryDirectory() as d:
            model_file = Path(d) / "test_only_crop.h5"
            model_file.write_bytes(b"not-hdf5")
            with patch.dict(os.environ, {"MODELS_DIR": d}):
                with self.assertRaises(FileNotFoundError):
                    resolve_model_path("test_only_crop")

    def test_raises_when_missing(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.dict(os.environ, {"MODELS_DIR": d}):
                with self.assertRaises(FileNotFoundError):
                    resolve_model_path("nonexistent_crop")


# ---------------------------------------------------------------------------
# Image cleanup helper
# ---------------------------------------------------------------------------
class DeleteScanImageTests(unittest.TestCase):
    def test_deletes_image_on_call(self):
        from inference.tasks import _delete_scan_image

        job = MagicMock()
        job.image.name = "scan_jobs/2026/07/29/leaf.jpg"
        _delete_scan_image(job)
        job.image.delete.assert_called_once_with(save=False)

    def test_handles_missing_image_gracefully(self):
        from inference.tasks import _delete_scan_image

        job = MagicMock()
        job.image.name = ""
        _delete_scan_image(job)
        job.image.delete.assert_not_called()

    def test_handles_delete_exception(self):
        from inference.tasks import _delete_scan_image

        job = MagicMock()
        job.image.name = "scan_jobs/leaf.jpg"
        job.image.delete.side_effect = OSError("disk full")
        _delete_scan_image(job)


# ---------------------------------------------------------------------------
# Scan storage config
# ---------------------------------------------------------------------------
class ScanStorageTests(unittest.TestCase):
    def test_scan_images_storage_is_filesystem(self):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "AgriProject.settings")
        try:
            import django
            django.setup()
            from django.conf import settings
            self.assertIn("scan_images", settings.STORAGES)
            self.assertEqual(
                settings.STORAGES["scan_images"]["BACKEND"],
                "django.core.files.storage.FileSystemStorage",
            )
        except Exception:
            self.skipTest("Django settings not available in this environment")
