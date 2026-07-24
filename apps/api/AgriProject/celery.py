import os
import sys

from celery import Celery
from celery.signals import worker_ready

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "AgriProject.settings")

app = Celery("AgriProject")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


def _is_scan_worker() -> bool:
    """True unless this process was started with -Q that excludes scan."""
    argv = sys.argv
    if "-Q" not in argv:
        return True
    i = argv.index("-Q")
    if i + 1 >= len(argv):
        return True
    queues = {q.strip() for q in argv[i + 1].split(",") if q.strip()}
    return "scan" in queues


@worker_ready.connect
def _warmup_scanner_models(sender, **kwargs):
    """Load TF gatekeeper + default crop model once so the first scan is not cold."""
    if not _is_scan_worker():
        return

    import logging

    log = logging.getLogger(__name__)
    crop = os.getenv("SCAN_WARMUP_CROP", "maize").strip() or "maize"
    try:
        from inference.gatekeeper import get_gatekeeper
        from inference.model_lru import get_crop_model

        log.info("Warming gatekeeper + %s model…", crop)
        get_gatekeeper()
        get_crop_model(crop)
        log.info("Scanner warmup complete")
    except Exception as exc:  # noqa: BLE001
        log.warning("Scanner warmup skipped: %s", exc)