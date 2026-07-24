"""LRU crop-model loader for the scanner worker (MAX_LOADED_CROP_MODELS=2 on 8 GB VPS).

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


class SafeDense:
    """Placeholder; real SafeDense is built after TF import inside get_crop_model."""


def _max_loaded() -> int:
    return max(1, int(os.getenv("MAX_LOADED_CROP_MODELS", "2")))


def _models_dir() -> Path:
    return Path(os.getenv("MODELS_DIR", "main_app/CropModels"))


def resolve_model_path(crop_selection: str) -> str:
    """Resolve .h5 path: local MODELS_DIR / CropModels first, then optional HF hub."""
    filename = f"{crop_selection}.h5"
    models_dir = _models_dir()
    candidates = [
        models_dir / filename,
        Path("main_app") / "CropModels" / filename,
        Path("/models") / filename,
    ]
    for path in candidates:
        if path.exists():
            logger.info("Using local crop model: %s", path)
            return str(path)

    repo_id = os.getenv("HF_MODEL_REPO_ID", "").strip()
    if repo_id:
        try:
            from huggingface_hub import hf_hub_download

            logger.info(
                "Local model missing; fetching %s from Hugging Face repo %s",
                filename,
                repo_id,
            )
            return hf_hub_download(repo_id=repo_id, filename=filename)
        except Exception as exc:  # noqa: BLE001
            logger.warning("HF download failed: %s", exc)

    raise FileNotFoundError(
        f"Model file '{filename}' not found in {models_dir} or HF."
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
