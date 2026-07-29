"""LRU crop-model loader for the scanner worker (MAX_LOADED_CROP_MODELS=2 on 8 GB VPS).

Models must be pre-provisioned via ``python manage.py sync_models`` during deployment.
Runtime resolution is local-only — no Hugging Face downloads during farmer scans.

Import TensorFlow only from worker processes — never from the API container.
"""

from __future__ import annotations

import gc
import logging
import os
import threading
from collections import OrderedDict
from pathlib import Path

logger = logging.getLogger(__name__)

_predict_lock = threading.Lock()
_lru: OrderedDict[str, object] = OrderedDict()
_lru_lock = threading.Lock()

HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"


class SafeDense:
    """Placeholder; real SafeDense is built after TF import inside get_crop_model."""


def _max_loaded() -> int:
    return max(1, int(os.getenv("MAX_LOADED_CROP_MODELS", "2")))


def _models_dir() -> Path:
    return Path(os.getenv("MODELS_DIR", "main_app/CropModels"))


def _is_valid_h5(path: Path) -> bool:
    try:
        with open(path, "rb") as fh:
            return fh.read(8) == HDF5_MAGIC
    except OSError:
        return False


def resolve_model_path(crop_selection: str) -> str:
    """Resolve .h5 path from local directories only. Fails fast if missing."""
    filename = f"{crop_selection}.h5"
    models_dir = _models_dir()
    candidates = [
        models_dir / filename,
        Path("main_app") / "CropModels" / filename,
        Path("/models") / filename,
    ]
    for path in candidates:
        if path.exists():
            if not _is_valid_h5(path):
                logger.error("Corrupt model file (bad HDF5 header): %s", path)
                continue
            logger.info("Using local crop model: %s", path)
            return str(path)

    raise FileNotFoundError(
        f"Model file '{filename}' not found or invalid in {models_dir}. "
        f"Run 'python manage.py sync_models' to provision models before starting the scanner."
    )


def get_crop_model(crop_selection: str):
    """Load crop model with process-wide LRU eviction."""
    from tensorflow.keras.layers import Dense
    from tensorflow.keras.models import load_model

    class _SafeDense(Dense):
        @classmethod
        def from_config(cls, config):
            if "quantization_config" in config:
                del config["quantization_config"]
            return super().from_config(config)

    model_path = resolve_model_path(crop_selection)
    max_n = _max_loaded()

    with _lru_lock:
        if model_path in _lru:
            _lru.move_to_end(model_path)
            return _lru[model_path]

        while len(_lru) >= max_n:
            evicted_path, evicted_model = _lru.popitem(last=False)
            logger.info("LRU evicting crop model: %s", evicted_path)
            del evicted_model
            gc.collect()
            try:
                from tensorflow.keras import backend as K

                K.clear_session()
            except Exception:  # noqa: BLE001
                pass

        logger.info("Loading crop model: %s (cache size cap=%s)", model_path, max_n)
        model = load_model(
            model_path, compile=False, custom_objects={"Dense": _SafeDense}
        )
        _lru[model_path] = model
        return model


def predict_locked(model, batch):
    """Serialize TF predict calls inside one worker process."""
    with _predict_lock:
        return model.predict(batch)
