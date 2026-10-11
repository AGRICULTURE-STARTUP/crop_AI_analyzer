"""Farmer home: one call with the highlights the dashboard shows after login."""

from __future__ import annotations

import re
from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsFarmer
from main_app.models import FarmHealthProfile, Wallet
from recommend.crops import crop_meta
from recommend.models import CropRecommendation
from scanner.models import ScanJob
from scanner.views import FREE_SCANS, SCAN_FEE


def _scan_row(job: ScanJob) -> dict:
    report = job.report or {}
    return {
        "id": str(job.id),
        "crop": job.crop,
        "status": job.status,
        "result": report.get("disease") or job.result_label or "",
        "health_status": report.get("health_status") or "",
        "confidence": job.confidence,
        "created_at": job.created_at,
    }


class FarmerOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        user = request.user
        profile = user.farmer_profile
        wallet, _ = Wallet.objects.get_or_create(user=user)
        try:
            health = profile.health_profile
        except FarmHealthProfile.DoesNotExist:
            health = None

        week_ago = timezone.now() - timedelta(days=7)
        scans = ScanJob.objects.filter(user=user)
        recs = CropRecommendation.objects.filter(user=user)
        last_rec = recs.first()
        crops = [c.strip() for c in re.split(r"[,;/|]+", profile.products or "") if c.strip()]

        last_advice = None
        if last_rec is not None:
            meta = crop_meta(last_rec.top_crop) or {"slug": last_rec.top_crop, "name": last_rec.top_crop}
            last_advice = {
                **meta,
                "confidence": round(last_rec.confidence, 4),
                "location": last_rec.location,
                "created_at": last_rec.created_at,
            }

        return Response(
            {
                "farm": {
                    "name": profile.farm_name or "",
                    "county": profile.county or "",
                    "size_acres": float(profile.farm_size_acres) if profile.farm_size_acres is not None else None,
                    "crops": crops,
                },
                "wallet": {
                    "balance": str(wallet.balance),
                    "scans_used": wallet.scan_count,
                    "free_scans_left": max(0, FREE_SCANS - wallet.scan_count),
                    "scan_fee": str(SCAN_FEE),
                },
                "health": (
                    {
                        "score": health.health_score,
                        "risk_tier": health.risk_tier,
                        "opt_in_for_lending": health.opt_in_for_lending,
                    }
                    if health
                    else None
                ),
                "scans": {
                    "total": scans.count(),
                    "last_7_days": scans.filter(created_at__gte=week_ago).count(),
                    "recent": [_scan_row(j) for j in scans[:5]],
                },
                "advisor": {"total": recs.count(), "last": last_advice},
            }
        )
