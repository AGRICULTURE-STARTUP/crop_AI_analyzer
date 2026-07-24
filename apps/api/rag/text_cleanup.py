"""Lightweight PDF text cleanup (no OCR dependency)."""

from __future__ import annotations

import re
import unicodedata


_FORM_FEED = re.compile(r"\f+")
_MULTI_BLANK = re.compile(r"\n{3,}")
_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_SPACE_BEFORE_NL = re.compile(r"[ \t]+\n")
_MULTI_SPACE = re.compile(r"[ \t]{2,}")
_BULLET_NOISE = re.compile(r"^[ \t]*[·•●▪◦]\s*", re.MULTILINE)


def clean_text(text: str) -> str:
    """Normalize extracted PDF text for better chunking and retrieval."""
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _FORM_FEED.sub("\n\n", text)
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = _SPACE_BEFORE_NL.sub("\n", text)
    text = _BULLET_NOISE.sub("- ", text)

    # Join lines that are clearly soft-wrapped mid-sentence.
    lines = text.split("\n")
    joined: list[str] = []
    for line in lines:
        stripped = line.strip()
        if (
            joined
            and stripped
            and not stripped.startswith(("-", "*", "•", ""))
            and not re.match(r"^\d+[\.\)]\s", stripped)
            and not joined[-1].endswith((".", ":", ";", "?", "!"))
            and not stripped[:1].isupper()
            and len(joined[-1]) < 120
        ):
            joined[-1] = f"{joined[-1]} {stripped}"
        else:
            joined.append(stripped if stripped else "")

    text = "\n".join(joined)
    text = _MULTI_BLANK.sub("\n\n", text)
    text = _MULTI_SPACE.sub(" ", text)
    return text.strip()
