"""Display metadata for the 22 crops the recommender knows.

Order matches the model's class labels (1 = rice ... 22 = coffee), the same
mapping the Panda Smart notebook used. `name_sw` is left empty where there is
no common Kiswahili name; the UI then shows the English name.
"""

from __future__ import annotations

CATEGORY_LABELS = {
    "cereal": "Cereals",
    "pulse": "Pulses",
    "fruit": "Fruits",
    "cash": "Cash crops",
}

# slug, English name, Kiswahili name, category, has a photo in the web app
CROPS: tuple[tuple[str, str, str, str, bool], ...] = (
    ("rice", "Rice", "Mpunga", "cereal", True),
    ("maize", "Maize", "Mahindi", "cereal", True),
    ("chickpea", "Chickpea", "", "pulse", True),
    ("kidneybeans", "Kidney beans", "Maharagwe", "pulse", True),
    ("pigeonpeas", "Pigeon peas", "Mbaazi", "pulse", True),
    ("mothbeans", "Moth beans", "", "pulse", False),
    ("mungbean", "Mung bean (green gram)", "Ndengu", "pulse", True),
    ("blackgram", "Black gram", "", "pulse", True),
    ("lentil", "Lentil", "", "pulse", True),
    ("pomegranate", "Pomegranate", "Komamanga", "fruit", True),
    ("banana", "Banana", "Ndizi", "fruit", True),
    ("mango", "Mango", "Embe", "fruit", True),
    ("grapes", "Grapes", "Zabibu", "fruit", True),
    ("watermelon", "Watermelon", "Tikiti maji", "fruit", True),
    ("muskmelon", "Muskmelon", "", "fruit", True),
    ("apple", "Apple", "Tufaha", "fruit", True),
    ("orange", "Orange", "Chungwa", "fruit", True),
    ("papaya", "Papaya", "Papai", "fruit", True),
    ("coconut", "Coconut", "Nazi", "fruit", True),
    ("cotton", "Cotton", "Pamba", "cash", False),
    ("jute", "Jute", "", "cash", True),
    ("coffee", "Coffee", "Kahawa", "cash", True),
)

CROP_SLUGS: tuple[str, ...] = tuple(c[0] for c in CROPS)
_BY_SLUG = {c[0]: c for c in CROPS}

FEATURE_LABELS = {
    "N": "Nitrogen (N)",
    "P": "Phosphorus (P)",
    "K": "Potassium (K)",
    "temperature": "Temperature",
    "humidity": "Humidity",
    "ph": "Soil pH",
    "rainfall": "Rainfall",
}

FEATURE_UNITS = {
    "N": "",
    "P": "",
    "K": "",
    "temperature": "°C",
    "humidity": "%",
    "ph": "",
    "rainfall": "mm",
}


def crop_meta(slug: str) -> dict | None:
    row = _BY_SLUG.get(slug)
    if row is None:
        return None
    slug, name, name_sw, category, has_photo = row
    return {
        "slug": slug,
        "name": name,
        "name_sw": name_sw or name,
        "category": category,
        "category_label": CATEGORY_LABELS[category],
        "image": f"/crops/{slug}.jpg" if has_photo else None,
    }
