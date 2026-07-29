"""Celery tasks for crop scanning (queue: scan)."""

from __future__ import annotations

import logging
import time
from decimal import Decimal

from celery import shared_task
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

SCAN_FEE = Decimal("20.00")
FREE_SCANS = 2


def _delete_scan_image(job):
    """Remove the uploaded image from local scan storage after processing."""
    try:
        if job.image and job.image.name:
            job.image.delete(save=False)
            logger.info("Deleted scan image for job %s", job.id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to delete scan image for job %s: %s", job.id, exc)


@shared_task(bind=True, name="inference.run_scan_job", max_retries=0, soft_time_limit=180)
def run_scan_job(self, job_id: str):
    """Gatekeeper → LRU crop model → predict → Groq advisory report."""
    from inference.crops import KNOWN_CROP_CLASSES
    from inference.gatekeeper import is_plant_image
    from inference.model_lru import get_crop_model, predict_locked
    from inference.scan_report import generate_scan_report
    from main_app.models import CropScanLog, FarmerProfile, Wallet
    from scanner.models import ScanJob

    try:
        job = ScanJob.objects.select_related("user").get(id=job_id)
    except ScanJob.DoesNotExist:
        logger.error("ScanJob %s not found", job_id)
        return {"ok": False, "error": "missing_job"}

    job.status = ScanJob.Status.PROCESSING
    job.report = None
    job.save(update_fields=["status", "report", "updated_at"])

    t0 = time.monotonic()
    try:
        image_path = job.image.path

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

        logger.info("Gatekeeper passed in %.1fs", time.monotonic() - t0)
        job.gatekeeper_passed = True
        job.save(update_fields=["gatekeeper_passed", "updated_at"])

        import numpy as np
        from keras.applications.efficientnet import preprocess_input
        from keras.preprocessing import image

        t1 = time.monotonic()
        model = get_crop_model(job.crop)
        img = image.load_img(image_path, target_size=(224, 224))
        batch = preprocess_input(np.expand_dims(image.img_to_array(img), axis=0))
        preds = predict_locked(model, batch)
        idx = int(np.argmax(preds[0]))
        confidence = float(preds[0][idx])
        labels = KNOWN_CROP_CLASSES.get(job.crop, [])
        label = labels[idx] if idx < len(labels) else str(idx)
        logger.info("Crop model predicted '%s' (%.1f%%) in %.1fs", label, confidence * 100, time.monotonic() - t1)

        job.result_label = label
        job.confidence = confidence
        job.save(update_fields=["result_label", "confidence", "updated_at"])

        t2 = time.monotonic()
        farmer_county = ""
        farmer_country = "Kenya"
        farmer_profile = None
        try:
            farmer_profile = FarmerProfile.objects.get(user=job.user)
            farmer_county = (farmer_profile.county or "").strip()
            farmer_country = (farmer_profile.country or "Kenya").strip() or "Kenya"
        except FarmerProfile.DoesNotExist:
            logger.warning("No FarmerProfile for user %s; report without county weather", job.user_id)

        report = generate_scan_report(
            job.crop,
            label,
            confidence,
            location=farmer_county,
            country=farmer_country,
        )
        logger.info("Report generated in %.1fs", time.monotonic() - t2)

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

            if farmer_profile is not None:
                CropScanLog.objects.create(
                    farmer=farmer_profile,
                    crop_type=job.crop,
                    result=label,
                    confidence_score=confidence,
                )
            else:
                try:
                    farmer = FarmerProfile.objects.get(user=job.user)
                    CropScanLog.objects.create(
                        farmer=farmer,
                        crop_type=job.crop,
                        result=label,
                        confidence_score=confidence,
                    )
                except FarmerProfile.DoesNotExist:
                    logger.warning(
                        "No FarmerProfile for user %s; skip CropScanLog", job.user_id
                    )

            job.result_label = label
            job.confidence = confidence
            job.report = report
            job.status = ScanJob.Status.COMPLETED
            job.completed_at = timezone.now()
            job.save(
                update_fields=[
                    "result_label",
                    "confidence",
                    "report",
                    "status",
                    "wallet_debited",
                    "completed_at",
                    "updated_at",
                ]
            )

        logger.info("Scan job %s completed in %.1fs total", job_id, time.monotonic() - t0)
        return {"ok": True, "label": label, "confidence": confidence, "report": report}

    except Exception as exc:  # noqa: BLE001
        logger.exception("Scan job %s failed", job_id)
        job.status = ScanJob.Status.FAILED
        job.error_message = str(exc)[:2000]
        job.completed_at = timezone.now()
        job.save(
            update_fields=["status", "error_message", "completed_at", "updated_at"]
        )
        return {"ok": False, "error": str(exc)}
    finally:
        _delete_scan_image(job)
