"""Plant gatekeeper (EfficientNetB0 ImageNet) — singleton per scanner worker process.

Uses exact ImageNet class names (not substrings) and fails closed: only images with
clear plant/produce evidence proceed to crop disease models.
"""

from __future__ import annotations

import logging
import os

import numpy as np

logger = logging.getLogger(__name__)

_gatekeeper_model = None

# Exact ImageNet labels that count as plant / produce / botanical evidence.
# Never use substring matching (pot ⊂ teapot, hip ⊂ hippopotamus).
PLANT_LABELS = frozenset(
    {
        "acorn",
        "acorn_squash",
        "agaric",
        "artichoke",
        "banana",
        "bell_pepper",
        "bolete",
        "broccoli",
        "buckeye",
        "butternut_squash",
        "cardoon",
        "cauliflower",
        "coral_fungus",
        "corn",
        "cucumber",
        "custard_apple",
        "daisy",
        "earthstar",
        "fig",
        "granny_smith",
        "greenhouse",
        "gyromitra",
        "hay",
        "head_cabbage",
        "hen-of-the-woods",
        "hip",  # rose hip (exact); does not match hippopotamus
        "jackfruit",
        "lemon",
        "mushroom",
        "orange",
        "pineapple",
        "pomegranate",
        "pot",  # flowerpot synset (exact); does not match teapot
        "rapeseed",
        "spaghetti_squash",
        "stinkhorn",
        "strawberry",
        "yellow_lady's_slipper",
        "zucchini",
    }
)

# Confident non-plant classes common in mistaken uploads or former false-friend collisions.
NON_PLANT_LABELS = frozenset(
    {
        "backpack",
        "cellular_telephone",
        "cheeseburger",
        "coffee_mug",
        "coffeepot",
        "convertible",
        "cup",
        "desktop_computer",
        "dial_telephone",
        "egyptian_cat",
        "hippopotamus",
        "hot_pot",
        "hotdog",
        "ipod",
        "jeep",
        "laptop",
        "mailbox",
        "minibus",
        "minivan",
        "monitor",
        "moving_van",
        "notebook",
        "passenger_car",
        "pay-phone",
        "pillow",
        "pizza",
        "plate",
        "potpie",
        "potter's_wheel",
        "racer",
        "remote_control",
        "running_shoe",
        "school_bus",
        "shoe_shop",
        "sock",
        "sports_car",
        "spotlight",
        "street_sign",
        "streetcar",
        "teapot",
        "television",
        "tow_truck",
        "trailer_truck",
        "tripod",
        "water_bottle",
    }
)


def _min_plant_conf() -> float:
    return float(os.getenv("GATEKEEPER_MIN_PLANT_CONF", "0.08"))


def _deny_conf() -> float:
    return float(os.getenv("GATEKEEPER_DENY_CONF", "0.25"))


def evaluate_predictions(
    decoded: list[tuple],
    *,
    min_plant_conf: float | None = None,
    deny_conf: float | None = None,
) -> bool:
    """Return True only when top-5 ImageNet decode shows plant evidence.

    ``decoded`` is Keras ``decode_predictions(..., top=5)[0]``:
    list of ``(imagenet_id, label, score)``.

    Fail-closed: uncertain or non-plant images return False.
    """
    if not decoded:
        return False

    min_plant = _min_plant_conf() if min_plant_conf is None else min_plant_conf
    deny_at = _deny_conf() if deny_conf is None else deny_conf

    normalized: list[tuple[str, float]] = []
    for item in decoded:
        if len(item) < 3:
            continue
        label = str(item[1]).lower().strip()
        score = float(item[2])
        normalized.append((label, score))

    if not normalized:
        return False

    top_label, top_score = normalized[0]
    plant_scores = [s for lab, s in normalized if lab in PLANT_LABELS]
    best_plant = max(plant_scores) if plant_scores else 0.0

    # Hard deny: dominant non-plant (top-1 or stronger than plant evidence in top-3).
    if top_label in NON_PLANT_LABELS and top_score >= deny_at:
        logger.info("Gatekeeper deny: %s (%.1f%%)", top_label, top_score * 100)
        return False

    for lab, score in normalized[:3]:
        if lab in NON_PLANT_LABELS and score >= deny_at and score > best_plant:
            logger.info(
                "Gatekeeper deny (top-3): %s (%.1f%%) beats plant evidence",
                lab,
                score * 100,
            )
            return False

    if best_plant >= min_plant:
        logger.info(
            "Gatekeeper pass: best plant evidence %.1f%% (min %.1f%%)",
            best_plant * 100,
            min_plant * 100,
        )
        return True

    logger.info(
        "Gatekeeper reject (fail-closed): top=%s (%.1f%%), best_plant=%.1f%%",
        top_label,
        top_score * 100,
        best_plant * 100,
    )
    return False


def get_gatekeeper():
    global _gatekeeper_model
    if _gatekeeper_model is None:
        from keras.applications.efficientnet import EfficientNetB0
        from tensorflow.keras import mixed_precision

        mixed_precision.set_global_policy("float32")
        logger.info("Loading EfficientNetB0 gatekeeper (once per process)")
        _gatekeeper_model = EfficientNetB0(weights="imagenet")
    return _gatekeeper_model


def warmup_gatekeeper():
    """Run a full dummy prediction + decode to pre-cache weights and metadata."""
    from keras.applications.efficientnet import decode_predictions, preprocess_input

    model = get_gatekeeper()
    dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
    dummy = preprocess_input(dummy)
    preds = model.predict(dummy)
    decode_predictions(preds, top=1)
    logger.info("Gatekeeper warmup complete (predict + decode cached)")


def is_plant_image(img_path: str) -> bool:
    from keras.applications.efficientnet import decode_predictions, preprocess_input
    from keras.preprocessing import image

    model = get_gatekeeper()
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)

    preds = model.predict(img_array)
    decoded = decode_predictions(preds, top=5)[0]
    return evaluate_predictions(decoded)
