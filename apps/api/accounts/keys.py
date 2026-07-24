"""API key generation and hashing for lending partners."""

from __future__ import annotations

import hashlib
import secrets


def generate_raw_api_key() -> str:
    """Return a URL-safe raw API key (shown once to the client)."""
    return secrets.token_urlsafe(32)


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def key_prefix(raw_key: str, length: int = 8) -> str:
    return raw_key[:length]
