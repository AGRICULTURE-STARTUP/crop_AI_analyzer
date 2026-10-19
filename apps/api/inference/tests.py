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
    def test_valid_h5_header(self):
        with tempfile.NamedTemporaryFile(suffix=".h5", delete=False) as f:
            f.write(HDF5_MAGIC + b"\x00" * 100)
            f.flush()
            self.assertTrue(_is_valid_h5(Path(f.name)))
            os.unlink(f.name)

    def test_invalid_h5_header(self):
        with tempfile.NamedTemporaryFile(suffix=".h5", delete=False) as f:
            f.write(b"version https://git-lfs.github.com/spec/v1\n")
            f.flush()
            self.assertFalse(_is_valid_h5(Path(f.name)))
            os.unlink(f.name)

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
# Gatekeeper (exact labels, fail-closed)
# ---------------------------------------------------------------------------
class GatekeeperEvaluateTests(unittest.TestCase):
    def _pred(self, *pairs):
        """Build fake decode_predictions tuples from (label, score) pairs."""
        return [(f"n{i}", label, score) for i, (label, score) in enumerate(pairs)]

    def test_rejects_empty(self):
        from inference.gatekeeper import evaluate_predictions

        self.assertFalse(evaluate_predictions([]))

    def test_rejects_uncertain_non_plant(self):
        from inference.gatekeeper import evaluate_predictions

        # Former fail-open hole: low confidence non-plant used to pass.
        decoded = self._pred(
            ("running_shoe", 0.22),
            ("sock", 0.18),
            ("backpack", 0.10),
            ("pillow", 0.08),
            ("notebook", 0.05),
        )
        self.assertFalse(evaluate_predictions(decoded))

    def test_rejects_teapot_despite_pot_substring(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("teapot", 0.91),
            ("coffeepot", 0.05),
            ("cup", 0.02),
            ("coffee_mug", 0.01),
            ("vase", 0.005),
        )
        self.assertFalse(evaluate_predictions(decoded))

    def test_rejects_hippopotamus_despite_hip_substring(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("hippopotamus", 0.88),
            ("hog", 0.04),
            ("wild_boar", 0.02),
            ("water_buffalo", 0.01),
            ("ox", 0.005),
        )
        self.assertFalse(evaluate_predictions(decoded))

    def test_rejects_spotlight_despite_pot_substring(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(("spotlight", 0.55), ("lampshade", 0.1), ("torch", 0.05))
        self.assertFalse(evaluate_predictions(decoded))

    def test_accepts_corn_leaf_evidence(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("corn", 0.42),
            ("ear", 0.12),
            ("broom", 0.05),
            ("hay", 0.04),
            ("hook", 0.02),
        )
        self.assertTrue(evaluate_predictions(decoded))

    def test_accepts_plant_in_top5_not_top1(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("hook", 0.20),
            ("chain", 0.15),
            ("head_cabbage", 0.12),
            ("nail", 0.08),
            ("screw", 0.05),
        )
        self.assertTrue(evaluate_predictions(decoded))

    def test_rejects_when_plant_evidence_too_weak(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("hook", 0.30),
            ("chain", 0.20),
            ("corn", 0.03),  # below default min 0.08
            ("nail", 0.02),
            ("screw", 0.01),
        )
        self.assertFalse(evaluate_predictions(decoded, min_plant_conf=0.08))

    def test_deny_beats_weaker_plant(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("laptop", 0.40),
            ("notebook", 0.20),
            ("corn", 0.10),
            ("monitor", 0.08),
            ("desk", 0.05),
        )
        self.assertFalse(evaluate_predictions(decoded))

    def test_exact_pot_flowerpot_can_pass(self):
        from inference.gatekeeper import evaluate_predictions

        decoded = self._pred(
            ("pot", 0.35),
            ("vase", 0.10),
            ("barrel", 0.05),
            ("bucket", 0.04),
            ("ashcan", 0.02),
        )
        self.assertTrue(evaluate_predictions(decoded))

    def test_plant_and_nonplant_label_sets_are_exact_imagenet_names(self):
        """If the Keras ImageNet index is cached, every curated label must exist."""
        from pathlib import Path

        from inference.gatekeeper import NON_PLANT_LABELS, PLANT_LABELS

        index_path = Path.home() / ".keras" / "models" / "imagenet_class_index.json"
        if not index_path.is_file():
            self.skipTest("ImageNet class index not cached locally")
        import json

        with index_path.open() as fh:
            data = json.load(fh)
        labels = {v[1].lower() for v in data.values()}
        missing_plant = sorted(PLANT_LABELS - labels)
        missing_deny = sorted(NON_PLANT_LABELS - labels)
        self.assertEqual(missing_plant, [], f"Unknown plant labels: {missing_plant}")
        self.assertEqual(missing_deny, [], f"Unknown deny labels: {missing_deny}")


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
