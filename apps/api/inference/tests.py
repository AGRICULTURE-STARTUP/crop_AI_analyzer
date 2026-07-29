import io
import tempfile
import unittest
from pathlib import Path

from inference.tasks import _local_image_path


class _RemoteFieldFile:
    name = "scan_jobs/leaf.jpg"

    @property
    def path(self):
        raise NotImplementedError("This backend doesn't support absolute paths.")

    def open(self, mode):
        assert mode == "rb"
        return io.BytesIO(b"remote-image")


class _LocalFieldFile:
    def __init__(self, path):
        self.path = path


class LocalImagePathTests(unittest.TestCase):
    def test_uses_existing_path_for_local_storage(self):
        with tempfile.TemporaryDirectory() as directory:
            image_path = Path(directory) / "leaf.jpg"
            image_path.write_bytes(b"local-image")

            with _local_image_path(_LocalFieldFile(str(image_path))) as resolved:
                self.assertEqual(resolved, str(image_path))

            self.assertTrue(image_path.exists())

    def test_copies_remote_file_and_removes_temporary_file(self):
        with _local_image_path(_RemoteFieldFile()) as resolved:
            temporary_path = Path(resolved)
            self.assertEqual(temporary_path.suffix, ".jpg")
            self.assertEqual(temporary_path.read_bytes(), b"remote-image")

        self.assertFalse(temporary_path.exists())
