"""SQLite storage for ingested KAMIS market prices."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

DEFAULT_DB_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "kamis_prices.db"
)

# Drop rows whose KAMIS price_date (or scrape time) is older than this.
RETENTION_DAYS = 7

# Natural key for a market observation — same stamp = same row (no duplicates).
DEDUPE_COLUMNS = (
    "product_id",
    "commodity",
    "classification",
    "grade",
    "market",
    "wholesale",
    "retail",
    "supply_volume",
    "county",
    "price_date",
)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS market_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    commodity TEXT NOT NULL,
    classification TEXT NOT NULL DEFAULT '',
    grade TEXT NOT NULL DEFAULT '',
    market TEXT NOT NULL DEFAULT '',
    wholesale TEXT NOT NULL DEFAULT '',
    retail TEXT NOT NULL DEFAULT '',
    supply_volume TEXT NOT NULL DEFAULT '',
    county TEXT NOT NULL DEFAULT '',
    price_date TEXT NOT NULL DEFAULT '',
    scraped_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_prices_commodity
    ON market_prices (commodity);
CREATE INDEX IF NOT EXISTS idx_market_prices_classification
    ON market_prices (classification);
CREATE INDEX IF NOT EXISTS idx_market_prices_county
    ON market_prices (county);
CREATE INDEX IF NOT EXISTS idx_market_prices_market
    ON market_prices (market);
CREATE INDEX IF NOT EXISTS idx_market_prices_date
    ON market_prices (price_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_product
    ON market_prices (product_id);

CREATE TABLE IF NOT EXISTS ingest_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    products_ok INTEGER NOT NULL DEFAULT 0,
    products_failed INTEGER NOT NULL DEFAULT 0,
    rows_written INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    detail TEXT NOT NULL DEFAULT ''
);
"""


def get_db_path() -> Path:
    raw = os.getenv("KAMIS_DB_PATH", "").strip()
    return Path(raw) if raw else DEFAULT_DB_PATH


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    _ensure_dedupe_index(conn)
    conn.commit()


def _ensure_dedupe_index(conn: sqlite3.Connection) -> None:
    """Collapse any legacy duplicates, then enforce uniqueness."""
    cols = ", ".join(DEDUPE_COLUMNS)
    conn.execute(
        f"""
        DELETE FROM market_prices
        WHERE id NOT IN (
            SELECT MIN(id) FROM market_prices GROUP BY {cols}
        )
        """
    )
    conn.execute(
        f"""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prices_dedupe
        ON market_prices ({cols})
        """
    )


def retention_cutoff_date(retention_days: int = RETENTION_DAYS) -> str:
    return (
        datetime.now(timezone.utc) - timedelta(days=retention_days)
    ).date().isoformat()


def purge_stale_rows(
    conn: sqlite3.Connection,
    retention_days: int = RETENTION_DAYS,
) -> int:
    """Remove rows older than ``retention_days`` (by KAMIS price_date).

    Rows without a price_date fall back to the scrape calendar day.
    """
    cutoff = retention_cutoff_date(retention_days)
    cur = conn.execute(
        """
        DELETE FROM market_prices
        WHERE (
            price_date != '' AND price_date < ?
        ) OR (
            (price_date IS NULL OR price_date = '')
            AND substr(scraped_at, 1, 10) < ?
        )
        """,
        (cutoff, cutoff),
    )
    return cur.rowcount


def insert_new_rows(
    conn: sqlite3.Connection,
    product_id: int,
    rows: list[dict],
    scraped_at: str,
) -> dict[str, int]:
    """Insert only rows that are not already stored (by natural key + date).

    Unchanged KAMIS timestamps produce zero inserts — that is expected and
    not an error. Returns counts of inserted vs skipped.
    """
    inserted = 0
    skipped = 0
    sql = """
        INSERT OR IGNORE INTO market_prices (
            product_id, commodity, classification, grade, market,
            wholesale, retail, supply_volume, county, price_date, scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    for row in rows:
        payload = (
            product_id,
            row.get("commodity", ""),
            row.get("classification", ""),
            row.get("grade", ""),
            row.get("market", ""),
            row.get("wholesale", ""),
            row.get("retail", ""),
            row.get("supply_volume", ""),
            row.get("county", ""),
            row.get("date", ""),
            scraped_at,
        )
        cur = conn.execute(sql, payload)
        if cur.rowcount:
            inserted += 1
        else:
            skipped += 1
    return {"inserted": inserted, "skipped": skipped}
