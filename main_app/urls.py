from django.urls import path
from . import views

urlpatterns = [
    path('',views.introduction_view,name="intro"),
    path('login', views.signin_view, name='login'),
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