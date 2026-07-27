"""Batch ingest: scrape top-N KAMIS rows per product into SQLite."""

from __future__ import annotations

import logging
import time
import urllib3
from datetime import datetime, timezone

from .db import (
    RETENTION_DAYS,
    connect,
    get_db_path,
    init_db,
    insert_new_rows,
    purge_stale_rows,
)
from .products import PRODUCT_CATALOG
from .scraper import fetch_product_rows

logger = logging.getLogger(__name__)

# KAMIS TLS chain is often incomplete; scrape still needs to succeed offline.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def ingest_all(
    *,
    limit_per_product: int = 10,
    delay_seconds: float = 0.75,
    product_ids: list[int] | None = None,
    retention_days: int = RETENTION_DAYS,
) -> dict:
    """Scrape each product and append only *new* dated rows to SQLite.

    - Duplicates (same commodity/market/prices/date) are skipped — if KAMIS
      has not published newer timestamps since the last run, the job continues.
    - After the batch, rows older than ``retention_days`` are purged.
    """
    db_path = get_db_path()
    started = datetime.now(timezone.utc).isoformat()
    ids = product_ids or sorted(PRODUCT_CATALOG.keys())

    conn = connect(db_path)
    init_db(conn)
    cur = conn.execute(
        "INSERT INTO ingest_runs (started_at, status) VALUES (?, 'running')",
        (started,),
    )
    run_id = cur.lastrowid
    conn.commit()

    ok = 0
    failed = 0
    rows_inserted = 0
    rows_skipped = 0
    errors: list[str] = []

    try:
        for product_id in ids:
            name = PRODUCT_CATALOG.get(product_id, str(product_id))
            scraped_at = datetime.now(timezone.utc).isoformat()
            try:
                rows = fetch_product_rows(product_id, limit=limit_per_product)
                for row in rows:
                    if not row.get("commodity"):
                        row["commodity"] = name
                stats = insert_new_rows(conn, product_id, rows, scraped_at)
                conn.commit()
                ok += 1
                rows_inserted += stats["inserted"]
                rows_skipped += stats["skipped"]
                if stats["inserted"] == 0:
                    logger.info(
                        "KAMIS unchanged product_id=%s name=%s "
                        "scraped=%s skipped=%s (no newer timestamps)",
                        product_id,
                        name,
                        len(rows),
                        stats["skipped"],
                    )
                else:
                    logger.info(
                        "KAMIS ingest ok product_id=%s name=%s "
                        "inserted=%s skipped=%s",
                        product_id,
                        name,
                        stats["inserted"],
                        stats["skipped"],
                    )
            except Exception as exc:  # noqa: BLE001 — continue batch on single failure
                failed += 1
                msg = f"{product_id}:{name}: {exc}"
                errors.append(msg)
                logger.warning("KAMIS ingest failed %s", msg)
                conn.rollback()
            if delay_seconds > 0:
                time.sleep(delay_seconds)

        purged = purge_stale_rows(conn, retention_days=retention_days)
        conn.commit()
        if purged:
            logger.info(
                "KAMIS purge removed %s rows older than %s days",
                purged,
                retention_days,
            )

        finished = datetime.now(timezone.utc).isoformat()
        status = "ok" if failed == 0 else ("partial" if ok else "failed")
        detail_parts = [
            f"inserted={rows_inserted}",
            f"skipped={rows_skipped}",
            f"purged={purged}",
            f"retention_days={retention_days}",
        ]
        if errors:
            detail_parts.append("; ".join(errors[:20]))
        detail = " | ".join(detail_parts)
        conn.execute(
            """
            UPDATE ingest_runs
            SET finished_at = ?, products_ok = ?, products_failed = ?,
                rows_written = ?, status = ?, detail = ?
            WHERE id = ?
            """,
            (finished, ok, failed, rows_inserted, status, detail, run_id),
        )
        conn.commit()
        return {
            "db_path": str(db_path),
            "run_id": run_id,
            "products_ok": ok,
            "products_failed": failed,
            "rows_written": rows_inserted,
            "rows_inserted": rows_inserted,
            "rows_skipped": rows_skipped,
            "rows_purged": purged,
            "retention_days": retention_days,
            "status": status,
            "errors": errors,
        }
    finally:
        conn.close()
