"""Crop recommendation engine: Gaussian Naive Bayes in plain Python.

The parameters in data/crop_model.json are the Panda Smart model (scikit-learn
GaussianNB + MinMaxScaler) exported by `manage.py build_crop_model`, so
predictions match the original Flask app without pickles, numpy or
scikit-learn in the API image.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

FEATURES: tuple[str, ...] = ("N", "P", "K", "temperature", "humidity", "ph", "rainfall")
MODEL_PATH = Path(__file__).resolve().parent / "data" / "crop_model.json"


@lru_cache(maxsize=1)
def load_model() -> dict:
    with MODEL_PATH.open(encoding="utf-8") as fh:
        model = json.load(fh)
    # Pre-compute the per-class constant: log prior - 0.5 * sum(log(2*pi*var)).
    model["_const"] = [
        math.log(prior) - 0.5 * sum(math.log(2.0 * math.pi * v) for v in variances)
        for prior, variances in zip(model["class_prior"], model["var"])
    ]
    return model


def model_info() -> dict:
    model = load_model()
    return {
        "version": model["version"],
        "algorithm": model["algorithm"],
        "accuracy": round(model["accuracy"], 5),
        "dataset_rows": model["dataset"]["rows"],
        "crops": len(model["classes"]),
        "feature_range": model["feature_range"],
    }


def _scaled(values: dict[str, float]) -> list[float]:
    scaler = load_model()["scaler"]
    return [
        float(values[f]) * scale + offset
        for f, scale, offset in zip(FEATURES, scaler["scale"], scaler["min"])
    ]


def rank_crops(values: dict[str, float], top: int = 3) -> list[tuple[str, float]]:
    """Return the `top` crops as (slug, probability), best first."""
    model = load_model()
    x = _scaled(values)
    scores = []
    for const, means, variances in zip(model["_const"], model["theta"], model["var"]):
        scores.append(
            const - 0.5 * sum((xi - m) ** 2 / v for xi, m, v in zip(x, means, variances))
        )
    peak = max(scores)
    weights = [math.exp(s - peak) for s in scores]
    total = sum(weights)
    ranked = sorted(
        zip(model["classes"], (w / total for w in weights)),
        key=lambda pair: pair[1],
        reverse=True,
    )
    return ranked[: max(1, top)]


def crop_stats(slug: str) -> dict | None:
    return load_model()["crop_stats"].get(slug)


def fit_report(values: dict[str, float], slug: str) -> list[dict]:
    """Compare each input with the middle 80% of the crop's training rows."""
    stats = crop_stats(slug) or {}
    report = []
    for feature in FEATURES:
        s = stats.get(feature)
        if not s:
            continue
        value = float(values[feature])
        if value < s["p10"]:
            status = "low"
        elif value > s["p90"]:
            status = "high"
        else:
            status = "ok"
        report.append(
            {
                "feature": feature,
                "value": value,
                "ideal_min": s["p10"],
                "ideal_max": s["p90"],
                "mean": s["mean"],
                "status": status,
            }
        )
    return report


def in_range_count(values: dict[str, float], slug: str) -> int:
    """How many of the 7 inputs sit inside the crop's typical (p10–p90) range."""
    return sum(1 for item in fit_report(values, slug) if item["status"] == "ok")


def out_of_range(values: dict[str, float]) -> list[dict]:
    """Inputs outside everything the model saw while training."""
    feature_range = load_model()["feature_range"]
    flagged = []
    for feature in FEATURES:
        lo, hi = feature_range[feature]
        value = float(values[feature])
        if value < lo or value > hi:
            flagged.append({"feature": feature, "value": value, "min": lo, "max": hi})
    return flagged
