from django import forms
from django.contrib.auth.forms import UserCreationForm,AuthenticationForm
from .models import FarmerProfile,BuyerProfile
from django.utils.html import strip_tags
import re

class SignupFormfarmer(UserCreationForm):
    first_name = forms.CharField(max_length=30, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}))
    last_name = forms.CharField(max_length=30, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}))
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}))
    phone_number = forms.CharField(max_length=20, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone Number'}))
    county = forms.CharField(max_length=100, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'County'}))
    country = forms.CharField(max_length=100, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Country'}))
    products = forms.CharField(widget=forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'Products you deal with (e.g., Maize, Potatoes)', 'rows': 3}))

    class Meta(UserCreationForm.Meta):
        fields = UserCreationForm.Meta.fields + ('first_name', 'last_name', 'email')

    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        if phone and not re.match(r'^\+?[\d\s\-]+$', phone):
            raise forms.ValidationError("Invalid phone number format.")
        return strip_tags(phone).strip()

    def clean_first_name(self):
        return strip_tags(self.cleaned_data.get('first_name')).strip()

    def clean_last_name(self):
        return strip_tags(self.cleaned_data.get('last_name')).strip()


class SignupFormbuyer(UserCreationForm):
    first_name = forms.CharField(max_length=30, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}))
    last_name = forms.CharField(max_length=30, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}))
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}))
    phone_number = forms.CharField(max_length=20, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone Number'}))
    county = forms.CharField(max_length=100, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'County'}))
    country = forms.CharField(max_length=100, required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Country'}))
    photo = forms.ImageField(required=True, widget=forms.ClearableFileInput(attrs={'class': 'form-control', 'accept': 'image/*'}))

    class Meta(UserCreationForm.Meta):
        fields = UserCreationForm.Meta.fields + ('first_name', 'last_name', 'email')

    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        if phone and not re.match(r'^\+?[\d\s\-]+$', phone):
            raise forms.ValidationError("Invalid phone number format.")
        return strip_tags(phone).strip()

    def clean_first_name(self):
        return strip_tags(self.cleaned_data.get('first_name')).strip()

    def clean_last_name(self):
        return strip_tags(self.cleaned_data.get('last_name')).strip()




   