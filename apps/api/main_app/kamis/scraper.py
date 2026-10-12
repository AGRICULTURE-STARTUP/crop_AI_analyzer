"""Fetch the latest KAMIS market rows for a single product id."""

from __future__ import annotations

import logging
import re
from html.parser import HTMLParser

import requests

logger = logging.getLogger(__name__)

KAMIS_MARKET_URL = "https://kamis.kilimo.go.ke/site/market"
USER_AGENT = (
    "Ukulima BoraKamisIngest/1.0 (+https://github.com; offline market cache)"
)
REQUEST_TIMEOUT = 45


class _TableParser(HTMLParser):
    """Minimal HTML table extractor for the KAMIS price table."""

    def __init__(self) -> None:
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row: list[str] = []
        self.current_cell: list[str] = []
        self.rows: list[list[str]] = []
        self.tables: list[list[list[str]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        name = tag.lower()
        if name == "table":
            self.in_table = True
            self.rows = []
        elif self.in_table and name == "tr":
            self.in_row = True
            self.current_row = []
        elif self.in_table and self.in_row and name in ("td", "th"):
            self.in_cell = True
            self.current_cell = []

    def handle_endtag(self, tag: str) -> None:
        name = tag.lower()
        if name == "table" and self.in_table:
            self.in_table = False
            if self.rows:
                self.tables.append(self.rows)
            self.rows = []
        elif name == "tr" and self.in_row:
            self.in_row = False
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = []
        elif name in ("td", "th") and self.in_cell:
            self.in_cell = False
            text = re.sub(r"\s+", " ", "".join(self.current_cell)).strip()
            self.current_row.append(text)
            self.current_cell = []

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.current_cell.append(data)


def _clean_cell(value: str) -> str:
    text = (value or "").strip()
    if text in {"-", "—", "–", "N/A", "n/a"}:
        return ""
    return text


def _rows_from_html(html: str) -> list[dict]:
    parser = _TableParser()
    parser.feed(html)
    target: list[list[str]] | None = None
    for table in parser.tables:
        if not table:
            continue
        header = [c.lower() for c in table[0]]
        if "commodity" in header and "market" in header and "county" in header:
            target = table
            break
    if not target or len(target) < 2:
        return []

    header = [c.lower() for c in target[0]]

    def col(*names: str) -> int | None:
        for name in names:
            if name in header:
                return header.index(name)
        return None

    idx = {
        "commodity": col("commodity"),
        "classification": col("classification"),
        "grade": col("grade"),
        "market": col("market"),
        "wholesale": col("wholesale"),
        "retail": col("retail"),
        "supply_volume": col("supply volume", "supply"),
        "county": col("county"),
        "date": col("date"),
    }
    if idx["commodity"] is None or idx["market"] is None:
        return []

    out: list[dict] = []
    for raw in target[1:]:
        def get(key: str) -> str:
            i = idx[key]
            if i is None or i >= len(raw):
                return ""
            return _clean_cell(raw[i])

        commodity = get("commodity")
        if not commodity:
            continue
        out.append(
            {
                "commodity": commodity,
                "classification": get("classification"),
                "grade": get("grade"),
                "market": get("market"),
                "wholesale": get("wholesale"),
                "retail": get("retail"),
                "supply_volume": get("supply_volume"),
                "county": get("county"),
                "date": get("date"),
            }
        )
    return out


def fetch_product_rows(product_id: int, limit: int = 10) -> list[dict]:
    """Scrape the latest ``limit`` rows for one KAMIS product id."""
    params = {"product": product_id}
    response = requests.get(
        KAMIS_MARKET_URL,
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        timeout=REQUEST_TIMEOUT,
        verify=False,  # KAMIS presents a self-signed chain in practice
    )
    response.raise_for_status()
    rows = _rows_from_html(response.text)
    return rows[:limit]
