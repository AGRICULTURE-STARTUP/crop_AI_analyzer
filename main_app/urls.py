from django.urls import path
from . import views

urlpatterns = [
    path('', views.page, name="page"),
    path('process', views.process, name="process"),
    path('chat/', views.chat, name='chat'),
    path('login/', views.signin_view, name='login'),
    path('logout/', views.signout_view, name='logout'),
    path('signup/farmer/', views.signup_farmer, name='signup_farmer'),
    path('signup/buyer/', views.signup_buyer, name='signup_buyer'),
    path('signup/agency/', views.signup_agency, name='signup_agency'),
    path('reset-password/', views.reset_password_view, name='forgot_password'),
]