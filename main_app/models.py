from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.
class FarmerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    products = models.TextField(blank=True, null=True, help_text="Products/plants dealt with")

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
        ('fertiliser', 'Fertiliser Agency'),
        ('pesticide', 'Pesticide Agency'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agency_profile')
    agency_type = models.CharField(max_length=20, choices=AGENCY_TYPES, default='fertiliser')
    location = models.CharField(max_length=255, blank=True, null=True)
    support_phone = models.CharField(max_length=20, blank=True, null=True)
    name = models.CharField(max_length=100, null=False, default='Unknown')
    email = models.EmailField(null=False, default='unknown@example.com')  
    def __str__(self):
        return f"{self.user.username} - {self.get_agency_type_display()}"
     