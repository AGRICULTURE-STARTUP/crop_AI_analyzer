"""Source-level metadata inference for RAG chunks."""

from __future__ import annotations

import os
import re
from typing import Any

# Filename stem -> canonical crop tag(s)
CROP_ALIASES: dict[str, list[str]] = {
    "maize": ["maize"],
    "bean": ["bean", "beans"],
    "beans": ["bean", "beans"],
    "potato": ["potato", "irish_potato"],
    "irish_potato": ["potato", "irish_potato"],
    "tomato": ["tomato"],
    "wheat": ["wheat"],
    "rice": ["rice"],
    "onion": ["onion"],
    "cabbage": ["cabbage"],
    "capsicum": ["capsicum", "ball_pepper"],
    "chilli": ["chilli", "chili"],
    "chili": ["chilli", "chili"],
    "cucumber": ["cucumber"],
    "cauliflower": ["cauliflower"],
    "pea": ["pea"],
    "tea": ["tea"],
    "coffee": ["coffee"],
    "cropsdetails": ["maize", "tea", "rice", "bean", "potato", "coffee"],
    "rice-cultivation-handbook": ["rice"],
    "soilatlas-2025_-ke-edition-web": ["soil"],
}

KISWAHILI_MARKERS = re.compile(
    r"\b(ni|na|ya|wa|za|kwa|kutoka|mazao|magugu|mbolea|maji|udongo|"
    r"maharagwe|mahindi|viazi|nyanya|kahawa|maji|ugonjwa|wadudu|"
    r"je\b|nini\b|vipi\b)\b",
    re.IGNORECASE,
)


def _stem(path: str) -> str:
    return os.path.splitext(os.path.basename(path))[0].lower()


def infer_crops(source_path: str, text: str = "") -> list[str]:
    stem = _stem(source_path)
    if stem in CROP_ALIASES:
        return list(CROP_ALIASES[stem])

    for key, crops in CROP_ALIASES.items():
        if key in stem:
            return list(crops)

    found: list[str] = []
    sample = (text or "")[:4000].lower()
    for key, crops in CROP_ALIASES.items():
        if key in ("cropsdetails", "soilatlas-2025_-ke-edition-web"):
            continue
        if re.search(rf"\b{re.escape(key)}\b", sample):
            found.extend(crops)
    return sorted(set(found)) or ["general"]


def infer_language(text: str) -> str:
    if not text:
        return "en"
    sample = text[:3000]
    hits = len(KISWAHILI_MARKERS.findall(sample))
    # Heuristic: several Swahili function/agri words → sw or mixed
    if hits >= 8:
        return "sw"
    if hits >= 3:
        return "mixed"
    return "en"


def build_chunk_metadata(
    source_path: str,
    *,
    page: int | None,
    chunk_index: int,
    file_hash: str,
    text: str,
    kb_version: str,
) -> dict[str, Any]:
    crops = infer_crops(source_path, text)
    return {
        "source": os.path.basename(source_path),
        "source_path": source_path,
        "page": page if page is not None else -1,
        "chunk_index": chunk_index,
        "file_hash": file_hash,
        "crop": ",".join(crops),
        "crops": crops,  # may be dropped by Chroma if list unsupported; crop string is primary
        "language": infer_language(text),
        "kb_version": kb_version,
        "doc_type": "extension_pdf",
    }
