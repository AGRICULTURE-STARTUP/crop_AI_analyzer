"""Query ingested KAMIS prices from SQLite (no live portal calls)."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from .db import connect, get_db_path, init_db
from .products import normalize_query, resolve_commodities


def search_prices(
    crop: str,
    location: str = "",
    *,
    limit: int = 50,
    db_path: Path | None = None,
) -> dict:
    """Return matching market rows for a crop family.

    Crop queries like ``maize`` expand to all related variants
    (Dry Maize, Green Maize, Maize Flour, etc.) and also match classification
    text such as White Maize / Yellow Maize.

    ``location`` is ignored (kept for backward compatibility). Each result
    already includes market + county so farmers can compare locations.
    """
    crop_q = normalize_query(crop)
    if not crop_q:
        return {
            "crop": crop,
            "matched_commodities": [],
            "count": 0,
            "results": [],
            "detail": "Query parameter 'crop' is required.",
        }

    commodities = resolve_commodities(crop_q)
    path = db_path or get_db_path()
    if not path.exists():
        return {
            "crop": crop,
            "matched_commodities": commodities,
            "count": 0,
            "results": [],
            "detail": "KAMIS price database is empty. Run ingest_kamis_prices first.",
        }

    conn = connect(path)
    try:
        init_db(conn)
        rows = _query(conn, crop_q, commodities, limit)
    finally:
        conn.close()

    results = [
        {
            "commodity": r["commodity"],
            "classification": r["classification"],
            "grade": r["grade"],
            "market": r["market"],
            "wholesale": r["wholesale"],
            "retail": r["retail"],
            "supply_volume": r["supply_volume"],
            "county": r["county"],
            "date": r["price_date"],
        }
        for r in rows
    ]

    payload: dict = {
        "crop": crop,
        "matched_commodities": commodities,
        "count": len(results),
        "results": results,
    }

    if not results:
        payload["detail"] = (
            "No recent prices found for that crop in the local KAMIS cache. "
            "Try another crop name, or use Produce buyers to contact verified buyers."
        )

    return payload


def _query(
    conn: sqlite3.Connection,
    crop_q: str,
    commodities: list[str],
    limit: int,
) -> list[sqlite3.Row]:
    crop_parts: list[str] = []
    params: list[object] = []

    if commodities:
        placeholders = ",".join("?" for _ in commodities)
        crop_parts.append(f"commodity IN ({placeholders})")
        params.extend(commodities)
        # Also catch classification variants (e.g. White Maize under Dry Maize)
        for name in commodities:
            token = normalize_query(name).split()[0]
            if len(token) >= 3:
                crop_parts.append("LOWER(classification) LIKE ?")
                params.append(f"%{token}%")

    # Broad fallback / reinforcement: substring on commodity + classification
    crop_parts.append("LOWER(commodity) LIKE ?")
    params.append(f"%{crop_q}%")
    crop_parts.append("LOWER(classification) LIKE ?")
    params.append(f"%{crop_q}%")

    where = "(" + " OR ".join(crop_parts) + ")"

    sql = f"""
        SELECT commodity, classification, grade, market, wholesale, retail,
               supply_volume, county, price_date
        FROM market_prices
        WHERE {where}
        ORDER BY price_date DESC, id DESC
        LIMIT ?
    """
    params.append(limit)
    return list(conn.execute(sql, params))
