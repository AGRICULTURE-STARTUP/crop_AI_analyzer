import uuid

from django.conf import settings
from django.db import models


class ScanJob(models.Model):
    """Async crop scan job — created by API, processed by worker_scanner."""

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scan_jobs",
    )
    crop = models.CharField(max_length=64)
    image = models.ImageField(upload_to="scan_jobs/%Y/%m/%d/")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.QUEUED, db_index=True
    )
    result_label = models.CharField(max_length=255, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    gatekeeper_passed = models.BooleanField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    wallet_debited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ScanJob {self.id} ({self.crop}) [{self.status}]"
