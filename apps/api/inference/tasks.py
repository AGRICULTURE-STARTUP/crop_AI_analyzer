"""Celery tasks for crop scanning (queue: scan) and RAG retrieve (queue: rag)."""

from __future__ import annotations

import logging
import os
from decimal import Decimal

from celery import shared_task
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

SCAN_FEE = Decimal("20.00")
FREE_SCANS = 2


@shared_task(bind=True, name="inference.run_scan_job", max_retries=0, soft_time_limit=60)
def run_scan_job(self, job_id: str):
    """Gatekeeper → LRU crop model → predict. Runs only in worker_scanner."""
    # Lazy TF imports happen inside gatekeeper / model_lru.
    from inference.crops import KNOWN_CROP_CLASSES
    from inference.gatekeeper import is_plant_image
    from inference.model_lru import get_crop_model, predict_locked
    from main_app.models import CropScanLog, FarmerProfile, Wallet
    from scanner.models import ScanJob

    try:
        job = ScanJob.objects.select_related("user").get(id=job_id)
    except ScanJob.DoesNotExist:
        logger.error("ScanJob %s not found", job_id)
        return {"ok": False, "error": "missing_job"}

    job.status = ScanJob.Status.PROCESSING
    job.save(update_fields=["status", "updated_at"])

    image_path = job.image.path
    try:
        if not is_plant_image(image_path):
            job.status = ScanJob.Status.REJECTED
            job.gatekeeper_passed = False
            job.error_message = "Image does not appear to be a plant/crop leaf."
            job.completed_at = timezone.now()
            job.save(
                update_fields=[
                    "status",
                    "gatekeeper_passed",
                    "error_message",
                    "completed_at",
                    "updated_at",
                ]
            )
            return {"ok": False, "status": "rejected"}

        job.gatekeeper_passed = True
        job.save(update_fields=["gatekeeper_passed", "updated_at"])

        import numpy as np
        from keras.applications.efficientnet import preprocess_input
        from keras.preprocessing import image

        model = get_crop_model(job.crop)
        img = image.load_img(image_path, target_size=(224, 224))
        batch = preprocess_input(np.expand_dims(image.img_to_array(img), axis=0))
        preds = predict_locked(model, batch)
        idx = int(np.argmax(preds[0]))
        confidence = float(preds[0][idx])
        labels = KNOWN_CROP_CLASSES.get(job.crop, [])
        label = labels[idx] if idx < len(labels) else str(idx)

        with transaction.atomic():
            wallet, _ = Wallet.objects.select_for_update().get_or_create(user=job.user)
            if wallet.scan_count >= FREE_SCANS:
                if wallet.balance < SCAN_FEE:
                    job.status = ScanJob.Status.FAILED
                    job.error_message = "Insufficient balance at debit time."
                    job.completed_at = timezone.now()
                    job.save(
                        update_fields=[
                            "status",
                            "error_message",
                            "completed_at",
                            "updated_at",
                        ]
                    )
                    return {"ok": False, "status": "failed_balance"}
                wallet.balance -= SCAN_FEE
                job.wallet_debited = True
            wallet.scan_count += 1
            wallet.save()

            try:
                farmer = FarmerProfile.objects.get(user=job.user)
                CropScanLog.objects.create(
                    farmer=farmer,
                    crop_type=job.crop,
                    result=label,
                    confidence_score=confidence,
                )
            except FarmerProfile.DoesNotExist:
                logger.warning("No FarmerProfile for user %s; skip CropScanLog", job.user_id)

            job.result_label = label
            job.confidence = confidence
            job.status = ScanJob.Status.COMPLETED
            job.completed_at = timezone.now()
            job.save(
                update_fields=[
                    "result_label",
                    "confidence",
                    "status",
                    "wallet_debited",
                    "completed_at",
                    "updated_at",
                ]
            )

        return {"ok": True, "label": label, "confidence": confidence}

    except Exception as exc:  # noqa: BLE001
        logger.exception("Scan job %s failed", job_id)
        job.status = ScanJob.Status.FAILED
        job.error_message = str(exc)[:2000]
        job.completed_at = timezone.now()
        job.save(
            update_fields=["status", "error_message", "completed_at", "updated_at"]
        )
        return {"ok": False, "error": str(exc)}


@shared_task(bind=True, name="inference.retrieve_context_task", soft_time_limit=30)
def retrieve_context_task(self, query: str, crop: str | None = None):
    """Hybrid retrieve for AgriBot — runs only in worker_rag."""
    from rag.retrieve import retrieve_context

    rerank = os.getenv("RERANKER_ENABLED", "false").lower() in ("1", "true", "yes")
    # retrieve_context currently uses module defaults; env toggles reranker inside rag if wired.
    context = retrieve_context(query)
    return {"context": context, "reranker_enabled": rerank}
