"""Plant gatekeeper (EfficientNetB0 ImageNet) — singleton per scanner worker process."""

from __future__ import annotations

import logging

import numpy as np

logger = logging.getLogger(__name__)

_gatekeeper_model = None

PLANT_WHITELIST = [
    "plant",
    "leaf",
    "flower",
    "tree",
    "grass",
    "daisy",
    "pot",
    "earthstar",
    "corn",
    "cabbage",
    "cucumber",
    "zucchini",
    "bell_pepper",
    "strawberry",
    "orange",
    "lemon",
    "fig",
    "pineapple",
    "banana",
    "apple",
    "broccoli",
    "cauliflower",
    "artichoke",
    "turnip",
    "mushroom",
    "agaric",
    "gyromitra",
    "stinkhorn",
    "bolete",
    "buckeye",
    "acorn",
    "rapeseed",
    "head_cabbage",
    "vegetable",
    "fruit",
    "greenhouse",
    "hay",
    "thistle",
    "cardoon",
    "squash",
    "pomegranate",
    "jackfruit",
    "custard_apple",
    "granny_smith",
    "lady's_slipper",
    "hip",
    "coral_fungus",
    "hen-of-the-woods",
    "velvet",
    "sponge",
    "tuber",
    "root",
    "stalk",
    "vine",
    "pod",
    "seed",
    "grain",
]

NON_PLANT_STRICT = [
    "car",
    "truck",
    "bus",
    "vehicle",
    "tire",
    "wheel",
    "logo",
    "sign",
    "building",
    "furniture",
    "person",
    "dog",
    "cat",
]


def get_gatekeeper():
    global _gatekeeper_model
    if _gatekeeper_model is None:
        from keras.applications.efficientnet import EfficientNetB0
        from tensorflow.keras import mixed_precision

        mixed_precision.set_global_policy("float32")
        logger.info("Loading EfficientNetB0 gatekeeper (once per process)")
        _gatekeeper_model = EfficientNetB0(weights="imagenet")
    return _gatekeeper_model


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

    top_label = decoded[0][1].lower()
    top_score = float(decoded[0][2])

    is_top_plant = any(w in top_label for w in PLANT_WHITELIST)
    if not is_top_plant and top_score > 0.8:
        logger.info(
            "Gatekeeper strict rejection: %s (%.1f%%)", top_label, top_score * 100
        )
        return False

    for _, label, conf in decoded:
        if any(w in label.lower() for w in PLANT_WHITELIST) and conf > 0.05:
            return True

    if top_score < 0.3 and not any(w in top_label for w in NON_PLANT_STRICT):
        return True

    return False
