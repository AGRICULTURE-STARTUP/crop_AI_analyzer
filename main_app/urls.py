from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('',views.introduction_view,name="intro"),
    path('homepage', views.homepage_view, name="homepage"),
    path('privacy-policy', views.privacy_policy_view, name="privacy_policy"),
    path('login', views.signin_view, name='login'),
    
    # Password Reset URLs
    path('password-reset/', 
         auth_views.PasswordResetView.as_view(template_name='password_reset_form.html'), 
         name='password_reset'),
    path('password-reset/done/', 
         auth_views.PasswordResetDoneView.as_view(template_name='password_reset_done.html'), 
         name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(template_name='password_reset_confirm.html'), 
         name='password_reset_confirm'),
    path('password-reset-complete/', 
         auth_views.PasswordResetCompleteView.as_view(template_name='password_reset_complete.html'), 
         name='password_reset_complete'),

    path('page', views.page, name="page"),
    path('process', views.process, name="process"),
    path('chat/', views.chat, name='chat'),
    path('logout/', views.signout_view, name='logout'),
    path('signup/farmer/', views.signup_farmer, name='signup_farmer'),
    path('signup/buyer/', views.signup_buyer, name='signup_buyer'),
    path('signup/agency/', views.signup_agency, name='signup_agency'),
    path('reset-password/', views.reset_password_view, name='forgot_password'),
    path('fertiliser',views.fertiliser_view,name='fertiliser'),
    path('fertiliser_firms/',views.fertiliser_display,name="fertiliser_firms"),
    path('market/', views.market_view, name='market_buyers'),
    path('market_firms/', views.market_display, name='market_firms'),
    path('farmers', views.farmer_view, name='farmers'),
    path('farmer_data/', views.farmer_display, name='farmer_data'),
]