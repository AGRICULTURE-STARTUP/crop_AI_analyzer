# main_app/utils_scoring.py
from datetime import timedelta
from django.utils import timezone
from .models import CropScanLog, MarketConnection, FarmHealthProfile

def calculate_farm_health_score(farmer_profile):
    """
    Calculates the Farm Health Score for a given farmer (max ~850).
    Updates and saves the farmer's FarmHealthProfile.
    """
    base_score = 300
    score = base_score
    
    # 1. Engagement: Activity in the last 6 months (Max +200)
    six_months_ago = timezone.now() - timedelta(days=180)
    recent_scans = CropScanLog.objects.filter(farmer=farmer_profile, timestamp__gte=six_months_ago)
    scan_count = recent_scans.count()
    
    # +10 points per scan, max 200 points
    engagement_points = min(scan_count * 10, 200)
    score += engagement_points

    # 2. Crop Health Ratio (Max +200)
    if scan_count > 0:
        # Assuming "Healthy" is a substring usually returned by the AI for healthy crops
        healthy_scans = recent_scans.filter(result__icontains='healthy').count()
        health_ratio = healthy_scans / scan_count
        # Full 200 points if 100% healthy, scaling down
        health_points = int(health_ratio * 200)
        score += health_points
    
    # 3. Market Connection Verifiability (Max +150)
    # Active connections mean guaranteed income
    completed_connections = MarketConnection.objects.filter(farmer=farmer_profile, status='Completed').count()
    market_points = min(completed_connections * 50, 150)
    score += market_points

    # Determine Risk Tier based on final score
    if score >= 700:
        risk_tier = "Low Risk"
    elif score >= 500:
        risk_tier = "Medium Risk"
    else:
        risk_tier = "High Risk"

    # Update or create the profile
    health_profile, created = FarmHealthProfile.objects.get_or_create(farmer=farmer_profile)
    health_profile.health_score = score
    health_profile.risk_tier = risk_tier
    health_profile.save()

    return health_profile
