"""Django management command: scrape KAMIS → SQLite (scheduled / manual)."""

from django.core.management.base import BaseCommand

from main_app.kamis.ingest import ingest_all
from main_app.kamis.products import PRODUCT_CATALOG


class Command(BaseCommand):
    help = (
        "Scrape the latest top-N KAMIS market rows for each commodity and "
        "store them in the offline SQLite database."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Rows to keep per commodity (default: 10).",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.75,
            help="Seconds to wait between KAMIS requests (default: 0.75).",
        )
        parser.add_argument(
            "--product-id",
            type=int,
            action="append",
            dest="product_ids",
            help="Optional product id(s) to scrape instead of the full catalog.",
        )
        parser.add_argument(
            "--retention-days",
            type=int,
            default=7,
            help="Drop rows whose price_date is older than this many days (default: 7).",
        )
        parser.add_argument(
            "--dry-run-count",
            action="store_true",
            help="Print how many products would be scraped and exit.",
        )

    def handle(self, *args, **options):
        product_ids = options.get("product_ids")
        if options["dry_run_count"]:
            n = len(product_ids) if product_ids else len(PRODUCT_CATALOG)
            self.stdout.write(f"Would scrape {n} products.")
            return

        self.stdout.write("Starting KAMIS ingest…")
        result = ingest_all(
            limit_per_product=options["limit"],
            delay_seconds=options["delay"],
            product_ids=product_ids,
            retention_days=options["retention_days"],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"status={result['status']} ok={result['products_ok']} "
                f"failed={result['products_failed']} "
                f"inserted={result['rows_inserted']} "
                f"skipped={result['rows_skipped']} "
                f"purged={result['rows_purged']} db={result['db_path']}"
            )
        )
        if result["errors"]:
            self.stdout.write(self.style.WARNING("Sample errors:"))
            for err in result["errors"][:10]:
                self.stdout.write(f"  - {err}")
