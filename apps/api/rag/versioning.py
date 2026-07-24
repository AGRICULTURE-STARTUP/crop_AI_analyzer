"""Knowledge-base versioning / ingest manifest."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any

from rag.config import KB_VERSION, MANIFEST_PATH


def file_sha256(path: str, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            block = f.read(chunk_size)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def load_manifest(path: str = MANIFEST_PATH) -> dict[str, Any]:
    if not os.path.exists(path):
        return {
            "kb_version": KB_VERSION,
            "created_at": None,
            "updated_at": None,
            "files": {},
            "stats": {},
        }
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_manifest(manifest: dict[str, Any], path: str = MANIFEST_PATH) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    if not manifest.get("created_at"):
        manifest["created_at"] = now
    manifest["updated_at"] = now
    manifest["kb_version"] = KB_VERSION
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")


def chunk_id(file_hash: str, chunk_index: int) -> str:
    return f"{file_hash[:16]}_{chunk_index:05d}"
