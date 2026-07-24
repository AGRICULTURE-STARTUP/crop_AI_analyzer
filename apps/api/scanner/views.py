import logging
import os
from decimal import Decimal

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from scanner.models import ScanJob
from scanner.serializers import (
    ScanJobCreateSerializer,
    ScanJobSerializer,
    crop_catalog_payload,
)

logger = logging.getLogger(__name__)

SCAN_FEE = Decimal("20.00")
FREE_SCANS = 2


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = False
        redis_ok = False
        try:
            from django.db import connection

            connection.ensure_connection()
            db_ok = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Health DB check failed: %s", exc)

        try:
            from django.core.cache import cache

            cache.set("healthcheck", "1", 5)
            redis_ok = cache.get("healthcheck") == "1"
        except Exception:
            # Fall back to raw Redis ping if Django cache is not Redis-backed yet
            try:
                import redis

                url = os.getenv("REDIS_URL", getattr(settings, "REDIS_URL", "redis://localhost:6379/0"))
                client = redis.from_url(url)
                redis_ok = client.ping()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Health Redis check failed: %s", exc)

        payload = {
            "status": "ok" if db_ok and redis_ok else "degraded",
            "postgres": db_ok,
            "redis": redis_ok,
        }
        code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(payload, status=code)


class CropListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"crops": crop_catalog_payload()})


def _wallet_gate(user):
    """Return (ok, error_response_or_None, will_debit)."""
    from main_app.models import Wallet

    wallet, _ = Wallet.objects.get_or_create(user=user)
    if wallet.scan_count < FREE_SCANS:
        return True, None, False
    if wallet.balance < SCAN_FEE:
        return (
            False,
            Response(
                {
                    "detail": "Insufficient wallet balance.",
                    "required": str(SCAN_FEE),
                    "balance": str(wallet.balance),
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            ),
            False,
        )
    return True, None, True


class ScanJobListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = ScanJob.objects.filter(user=request.user)[:50]
        return Response(ScanJobSerializer(jobs, many=True).data)

    def post(self, request):
        max_queued = int(os.getenv("MAX_QUEUED_SCAN_JOBS", "20"))
        queued = ScanJob.objects.filter(
            status__in=[ScanJob.Status.QUEUED, ScanJob.Status.PROCESSING]
        ).count()
        if queued >= max_queued:
            return Response(
                {"detail": "Scan queue is full. Retry later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
                headers={"Retry-After": "30"},
            )

        serializer = ScanJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ok, err, will_debit = _wallet_gate(request.user)
        if not ok:
            return err

        job = ScanJob.objects.create(
            user=request.user,
            crop=serializer.validated_data["crop"],
            image=serializer.validated_data["image"],
            status=ScanJob.Status.QUEUED,
        )

        from inference.tasks import run_scan_job

        async_result = run_scan_job.apply_async(args=[str(job.id)], queue="scan")
        job.celery_task_id = async_result.id
        job.save(update_fields=["celery_task_id", "updated_at"])

        # Debit is applied in the worker on successful completion; reserve free/count bookkeeping there.
        # Stash intent on job via wallet_debited=False until worker decides.
        _ = will_debit

        return Response(
            {"job_id": str(job.id), "status": job.status},
            status=status.HTTP_202_ACCEPTED,
        )


class ScanJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        try:
            job = ScanJob.objects.get(id=job_id, user=request.user)
        except ScanJob.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        data = ScanJobSerializer(job).data
        try:
            from main_app.models import Wallet

            wallet = Wallet.objects.get(user=request.user)
            data["wallet_balance"] = str(wallet.balance)
        except Exception:  # noqa: BLE001
            pass
        return Response(data)
