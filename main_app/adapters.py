from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.shortcuts import redirect
from .models import FarmerProfile, BuyerProfile

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        """
        Saves a newly signed up social login. In this case, we also 
        want to handle the creation of the user's specific role profile.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Check if the user selected a role in the social signup form
        # The form data is usually in request.POST
        user_type = request.POST.get('user_type')
        
        if user_type == 'farmer':
            FarmerProfile.objects.get_or_create(user=user)
        elif user_type == 'buyer':
            BuyerProfile.objects.get_or_create(user=user)
            
        return user

    def get_signup_redirect_url(self, sociallogin):
        """
        After signup, redirect to the appropriate dashboard based on the profile.
        """
        user = sociallogin.user
        if hasattr(user, 'farmer_profile'):
            return '/page/'
        elif hasattr(user, 'buyer_profile'):
            return '/dashboard/buyer/'
        return super().get_signup_redirect_url(sociallogin)
