"""Server-side inactivity tracking for JWT sessions."""

from __future__ import annotations

import os
import time

from django.core.cache import cache


IDLE_TIMEOUT_SECONDS = int(os.getenv("SESSION_IDLE_TIMEOUT_SECONDS", "1800"))
_KEY_PREFIX = "jwt-session-activity"


def session_id_for_token(token) -> str:
    """Return the session claim, with a compatibility key for old tokens."""
    session_id = token.get("sid")
    if session_id:
        return str(session_id)
    return f"legacy-user-{token.get('user_id', 'unknown')}"


def mark_session_active(session_id: str) -> None:
    cache.set(
        f"{_KEY_PREFIX}:{session_id}",
        int(time.time()),
        timeout=IDLE_TIMEOUT_SECONDS,
    )


def is_session_active(session_id: str, issued_at: int | None = None) -> bool:
    """Check cached activity; token issue time safely handles cache misses."""
    last_activity = cache.get(f"{_KEY_PREFIX}:{session_id}")
    if last_activity is None:
        if issued_at is None:
            return False
        return int(time.time()) - int(issued_at) < IDLE_TIMEOUT_SECONDS
    return int(time.time()) - int(last_activity) < IDLE_TIMEOUT_SECONDS


def invalidate_session(session_id: str) -> None:
    # Keep a short-lived tombstone so token-issue fallback cannot revive logout.
    cache.set(
        f"{_KEY_PREFIX}:{session_id}",
        0,
        timeout=IDLE_TIMEOUT_SECONDS,
    )
