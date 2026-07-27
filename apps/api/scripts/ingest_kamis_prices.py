#!/usr/bin/env python3
"""Standalone KAMIS → SQLite ingest (no Django required).

Usage:
  python scripts/ingest_kamis_prices.py
  python scripts/ingest_kamis_prices.py --limit 10 --delay 0.5
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from main_app.kamis.ingest import ingest_all  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest KAMIS market prices into SQLite")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--delay", type=float, default=0.75)
    parser.add_argument(
        "--retention-days",
        type=int,
        default=7,
        help="Drop rows older than this many days (default: 7).",
    )
    parser.add_argument("--product-id", type=int, action="append", dest="product_ids")
    args = parser.parse_args()

    result = ingest_all(
        limit_per_product=args.limit,
        delay_seconds=args.delay,
        product_ids=args.product_ids,
        retention_days=args.retention_days,
    )
    print(
        f"status={result['status']} ok={result['products_ok']} "
        f"failed={result['products_failed']} "
        f"inserted={result['rows_inserted']} skipped={result['rows_skipped']} "
        f"purged={result['rows_purged']} db={result['db_path']}"
    )
    for err in result.get("errors", [])[:10]:
        print(f"  error: {err}", file=sys.stderr)
    return 0 if result["status"] in ("ok", "partial") else 1


if __name__ == "__main__":
    raise SystemExit(main())
