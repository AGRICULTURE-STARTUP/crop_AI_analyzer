from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid
import secrets

# Create your models here.
class FarmerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    products = models.TextField(blank=True, null=True, help_text="Products/plants")

    def __str__(self):
        return f"{self.user.username} - Farmer"

class BuyerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='buyer_profile')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    first_name = models.CharField(max_length=100, null=False, default='Unknown')
    email = models.EmailField(null=False, default='unknown@example.com')  
    def __str__(self):
        return f"{self.user.username} - Buyer"

class AgencyProfile(models.Model):
    AGENCY_TYPES = (
        ('fertiliser', 'Fertiliser Company'),
        ('pesticide', 'Pesticide Company'),
        ('seed','Seed Company')
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agency_profile')
    agency_type = models.CharField(max_length=20, choices=AGENCY_TYPES, default='fertiliser')
    location = models.CharField(max_length=255, blank=True, null=True)
    support_phone = models.CharField(max_length=20, blank=True, null=True)
    name = models.CharField(max_length=100, null=False, default='Unknown')
    email = models.EmailField(null=False, default='unknown@example.com')  
    def __str__(self):
        return f"{self.user.username} - {self.get_agency_type_display()}"


class AgencyProduct(models.Model):
    agency = models.ForeignKey(AgencyProfile, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Cost in local currency")
    image = models.ImageField(upload_to='uploads/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.agency.name}"


# --- Micro-Lending & Farm Health Models ---

class CropScanLog(models.Model):
    """Tracks every time a farmer uses the AI scanner to diagnose crops."""
    farmer = models.ForeignKey(FarmerProfile, on_delete=models.CASCADE, related_name='scan_logs')
    crop_type = models.CharField(max_length=100)
    result = models.CharField(max_length=255)  # e.g., 'Healthy', 'Early Blight'
    confidence_score = models.FloatField(default=0.0) # From 0.0 to 1.0 (or percentage)
    timestamp = models.DateTimeField(auto_now_add=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.farmer.user.username} scanned {self.crop_type} - {self.result}"

class MarketConnection(models.Model):
    """Tracks when a farmer successfully links with a buyer."""
    farmer = models.ForeignKey(FarmerProfile, on_delete=models.CASCADE, related_name='market_connections')
    buyer = models.ForeignKey(BuyerProfile, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, default='Pending') # 'Pending', 'Completed', 'Cancelled'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.farmer.user.username} -> {self.buyer.user.username} ({self.status})"

class FarmHealthProfile(models.Model):
    """Stores the dynamically calculated farm health/credit score."""
    farmer = models.OneToOneField(FarmerProfile, on_delete=models.CASCADE, related_name='health_profile')
    health_score = models.IntegerField(default=300) # e.g. 300 to 850
    risk_tier = models.CharField(max_length=20, default='High Risk') # 'Low Risk', 'Medium Risk', 'High Risk'
    last_calculated = models.DateTimeField(auto_now=True)
    opt_in_for_lending = models.BooleanField(default=False, help_text="User consents to sharing data with banks")

    def __str__(self):
        return f"{self.farmer.user.username} Score: {self.health_score} ({self.risk_tier})"

def generate_api_key():
    return secrets.token_urlsafe(32)

class PartnerAPIKey(models.Model):
    """Secure API tokens for partnered financial institutions."""
    partner_name = models.CharField(max_length=100)
    api_key = models.CharField(max_length=100, unique=True, default=generate_api_key)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Partner: {self.partner_name} {'(Active)' if self.is_active else '(Inactive)'}"

# Signal to automatically create FarmHealthProfile when a FarmerProfile is created
@receiver(post_save, sender=FarmerProfile)
def create_farm_health_profile(sender, instance, created, **kwargs):
    if created:
        FarmHealthProfile.objects.create(farmer=instance)

@receiver(post_save, sender=FarmerProfile)
def save_farm_health_profile(sender, instance, **kwargs):
    try:
        instance.health_profile.save()
    except FarmHealthProfile.DoesNotExist:
        FarmHealthProfile.objects.create(farmer=instance)


# --- Monetization & Payment Models ---

class Wallet(models.Model):
    """Stores pre-paid credits for farmers to use AI services."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    scan_count = models.IntegerField(default=0)
    chat_count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} Wallet: KSh {self.balance}"

class AgrovetSubscription(models.Model):
    """Tracks monthly subscriptions for Agrovets to list products."""
    PLAN_CHOICES = (
        ('basic', 'Basic Storefront (KSh 1,500/mo)'),
        ('premium', 'Premium Featured (KSh 3,500/mo)'),
    )
    agency = models.OneToOneField(AgencyProfile, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='basic')
    start_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField()
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.agency.name} - {self.plan} ({'Active' if self.is_active else 'Expired'})"

class MpesaTransaction(models.Model):
    """Logs all M-Pesa STK Push transactions for auditing and fulfillment."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mpesa_transactions')
    phone_number = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    checkout_request_id = models.CharField(max_length=100, unique=True)
    merchant_request_id = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='Pending') # 'Pending', 'Success', 'Failed'
    receipt_number = models.CharField(max_length=50, blank=True, null=True)
    result_desc = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.amount} - {self.status}"

# Signal to automatically create Wallet when a User is created
@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_wallet(sender, instance, **kwargs):
    try:
        instance.wallet.save()
    except Wallet.DoesNotExist:
        Wallet.objects.create(user=instance)