"""Rebuild recommend/data/crop_model.json from Crop_recommendation.csv.

Reproduces the Panda Smart training run exactly: train_test_split(test_size=0.2,
random_state=42), MinMaxScaler fitted on the training rows, GaussianNB with the
scikit-learn defaults (var_smoothing=1e-9). The output is plain JSON so the API
never loads pickles or needs numpy at runtime. Rebuilding needs numpy.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from recommend.crops import CROP_SLUGS
from recommend.engine import FEATURES

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


class Command(BaseCommand):
    help = "Rebuild data/crop_model.json from data/Crop_recommendation.csv (needs numpy)."

    def handle(self, *args, **options):
        try:
            import numpy as np
        except ImportError as exc:  # pragma: no cover - depends on environment
            raise CommandError(
                "numpy is required to rebuild the crop model (pip install numpy)."
            ) from exc

        csv_path = DATA_DIR / "Crop_recommendation.csv"
        with csv_path.open(encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        if not rows:
            raise CommandError(f"No rows in {csv_path}")

        label_of = {slug: i + 1 for i, slug in enumerate(CROP_SLUGS)}
        X = np.array([[float(r[f]) for f in FEATURES] for r in rows], dtype=np.float64)
        y = np.array([label_of[r["label"].strip()] for r in rows])

        # train_test_split(test_size=0.2, random_state=42) == ShuffleSplit order.
        n = len(rows)
        n_test = int(np.ceil(0.2 * n))
        perm = np.random.RandomState(42).permutation(n)
        test_idx, train_idx = perm[:n_test], perm[n_test:]
        X_train, y_train = X[train_idx], y[train_idx]
        X_test, y_test = X[test_idx], y[test_idx]

        # MinMaxScaler (feature_range=(0, 1)), same arithmetic as scikit-learn.
        data_min = X_train.min(axis=0)
        data_max = X_train.max(axis=0)
        scale = 1.0 / (data_max - data_min)
        min_ = 0.0 - data_min * scale

        def transform(a):
            out = a.copy()
            out *= scale
            out += min_
            return out

        S_train = transform(X_train)
        classes = np.unique(y_train)
        theta = np.zeros((len(classes), len(FEATURES)))
        var = np.zeros_like(theta)
        counts = np.zeros(len(classes))
        for i, c in enumerate(classes):
            rows_c = S_train[y_train == c, :]
            theta[i] = np.mean(rows_c, axis=0)
            var[i] = np.var(rows_c, axis=0)
            counts[i] = rows_c.shape[0]
        var += 1e-9 * np.var(S_train, axis=0).max()
        prior = counts / counts.sum()

        S_test = transform(X_test)
        jll = np.log(prior)[None, :] - 0.5 * np.sum(np.log(2.0 * np.pi * var), axis=1)[None, :]
        jll = jll - 0.5 * (((S_test[:, None, :] - theta[None, :, :]) ** 2) / var[None, :, :]).sum(axis=2)
        accuracy = float((classes[np.argmax(jll, axis=1)] == y_test).mean())

        crop_stats = {}
        for slug in CROP_SLUGS:
            rows_c = X[y == label_of[slug]]
            crop_stats[slug] = {
                feature: {
                    "min": round(float(rows_c[:, j].min()), 2),
                    "p10": round(float(np.percentile(rows_c[:, j], 10)), 2),
                    "mean": round(float(rows_c[:, j].mean()), 2),
                    "p90": round(float(np.percentile(rows_c[:, j], 90)), 2),
                    "max": round(float(rows_c[:, j].max()), 2),
                }
                for j, feature in enumerate(FEATURES)
            }

        model = {
            "version": "panda-smart-gnb-1",
            "algorithm": "Gaussian Naive Bayes",
            "source": (
                "Panda Smart crop recommender (Karatina University): "
                "GaussianNB + MinMaxScaler, 80/20 split, random_state=42"
            ),
            "dataset": {
                "file": "Crop_recommendation.csv",
                "rows": n,
                "train_rows": int(len(train_idx)),
                "test_rows": int(len(test_idx)),
            },
            "accuracy": accuracy,
            "features": list(FEATURES),
            "classes": [CROP_SLUGS[int(c) - 1] for c in classes],
            "scaler": {
                "data_min": data_min.tolist(),
                "data_max": data_max.tolist(),
                "scale": scale.tolist(),
                "min": min_.tolist(),
            },
            "theta": theta.tolist(),
            "var": var.tolist(),
            "class_prior": prior.tolist(),
            "feature_range": {
                f: [round(float(X[:, j].min()), 2), round(float(X[:, j].max()), 2)]
                for j, f in enumerate(FEATURES)
            },
            "crop_stats": crop_stats,
        }

        out = DATA_DIR / "crop_model.json"
        out.write_text(json.dumps(model, indent=1), encoding="utf-8")
        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {out.name}: {len(classes)} crops, test accuracy {accuracy:.4f}"
            )
        )
