from django.urls import path

from accounts.views import (
    AdminLenderApproveView,
    AdminLenderListView,
    AdminLenderSuspendView,
    AdminRevenueView,
    AgencyRegisterView,
    BuyerRegisterView,
    FarmerRegisterView,
    LenderAPIKeyListCreateView,
    LenderAPIKeyRevokeView,
    LenderAPIKeyRotateView,
    LenderMeView,
    LenderRegisterView,
    LenderScoreView,
    LenderUsageView,
    LogoutView,
    MeView,
    MpesaTopupView,
    PartnerFarmHealthScoreView,
    WalletView,
    WeatherView,
)
from accounts.admin_views import (
    AdminOverviewView,
    AdminProductListView,
    AdminProductVisibilityView,
    AdminUserActiveView,
    AdminUserListView,
)
from accounts.chat_views import ChatMessageView
from accounts.farmer_views import FarmerOverviewView
from accounts.input_views import (
    InputAgencyListView,
    InputProductListView,
    NearestAgencyListView,
    MyAgencyProductDetailView,
    MyAgencyProductListCreateView,
)
from accounts.farmer_product_views import (
    MyFarmerProductDetailView,
    MyFarmerProductListCreateView,
)
from accounts.store_views import StoreProductDetailView, StoreProductListView
from accounts.ussd_views import UssdGatewayView, UssdSimulateView
from main_app.kamis_views import (
    BuyersDirectoryView,
    FarmersDirectoryView,
    KamisMarketPricesView,
)

urlpatterns = [
    # Auth
    path("auth/register/farmer/", FarmerRegisterView.as_view(), name="auth_register_farmer"),
    path("auth/register/buyer/", BuyerRegisterView.as_view(), name="auth_register_buyer"),
    path("auth/register/agency/", AgencyRegisterView.as_view(), name="auth_register_agency"),
    path("auth/register/lender/", LenderRegisterView.as_view(), name="auth_register_lender"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    # Current user
    path("me/", MeView.as_view(), name="me"),
    path("weather/", WeatherView.as_view(), name="weather"),
    path("farmer/overview/", FarmerOverviewView.as_view(), name="farmer_overview"),
    # Offline KAMIS market prices (SQLite cache; no live scrape)
    path(
        "market/kamis-prices/",
        KamisMarketPricesView.as_view(),
        name="kamis_market_prices",
    ),
    path(
        "market/farmers/",
        FarmersDirectoryView.as_view(),
        name="market_farmers_directory",
    ),
    path(
        "market/buyers/",
        BuyersDirectoryView.as_view(),
        name="market_buyers_directory",
    ),
    # AgriBot
    path("chat/messages/", ChatMessageView.as_view(), name="chat_messages"),
    # Lender portal
    path("lender/me/", LenderMeView.as_view(), name="lender_me"),
    path("lender/api-keys/", LenderAPIKeyListCreateView.as_view(), name="lender_api_keys"),
    path(
        "lender/api-keys/<int:key_id>/rotate/",
        LenderAPIKeyRotateView.as_view(),
        name="lender_api_key_rotate",
    ),
    path(
        "lender/api-keys/<int:key_id>/revoke/",
        LenderAPIKeyRevokeView.as_view(),
        name="lender_api_key_revoke",
    ),
    path("lender/usage/", LenderUsageView.as_view(), name="lender_usage"),
    path("lender/score/", LenderScoreView.as_view(), name="lender_score"),
    # M2M Farm Health Score (Bearer LendingAPIKey; legacy PartnerAPIKey fallback)
    path(
        "lending/score/",
        PartnerFarmHealthScoreView.as_view(),
        name="farm_health_score_api",
    ),
    # Admin console
    path("admin/overview/", AdminOverviewView.as_view(), name="admin_overview"),
    path("admin/users/", AdminUserListView.as_view(), name="admin_users"),
    path(
        "admin/users/<int:user_id>/active/",
        AdminUserActiveView.as_view(),
        name="admin_user_active",
    ),
    path("admin/products/", AdminProductListView.as_view(), name="admin_products"),
    path(
        "admin/products/<int:product_id>/visibility/",
        AdminProductVisibilityView.as_view(),
        name="admin_product_visibility",
    ),
    # Admin lender moderation
    path("admin/revenue/", AdminRevenueView.as_view(), name="admin_revenue"),
    path("admin/lenders/", AdminLenderListView.as_view(), name="admin_lenders"),
    path(
        "admin/lenders/<int:partner_id>/approve/",
        AdminLenderApproveView.as_view(),
        name="admin_lender_approve",
    ),
    path(
        "admin/lenders/<int:partner_id>/suspend/",
        AdminLenderSuspendView.as_view(),
        name="admin_lender_suspend",
    ),
    # Wallet / payments
    path("wallet/", WalletView.as_view(), name="wallet"),
    path("mpesa/topup/", MpesaTopupView.as_view(), name="api_mpesa_topup"),
    # Public storefront (browse without an account; contacts need sign-in)
    path("store/products/", StoreProductListView.as_view(), name="store_products"),
    path(
        "store/products/<int:product_id>/",
        StoreProductDetailView.as_view(),
        name="store_product_detail",
    ),
    # Inputs marketplace (registered agencies only — no web agent)
    path("inputs/agencies/", InputAgencyListView.as_view(), name="inputs_agencies"),
    path(
        "inputs/agencies/nearest/",
        NearestAgencyListView.as_view(),
        name="inputs_agencies_nearest",
    ),
    path("inputs/products/", InputProductListView.as_view(), name="inputs_products"),
    path(
        "inputs/my-products/",
        MyAgencyProductListCreateView.as_view(),
        name="inputs_my_products",
    ),
    path(
        "inputs/my-products/<int:product_id>/",
        MyAgencyProductDetailView.as_view(),
        name="inputs_my_product_detail",
    ),
    # Farmer produce listings
    path(
        "farmer/products/",
        MyFarmerProductListCreateView.as_view(),
        name="farmer_products",
    ),
    path(
        "farmer/products/<int:product_id>/",
        MyFarmerProductDetailView.as_view(),
        name="farmer_product_detail",
    ),
    # USSD / SMS gateway (+ homepage simulator)
    path("ussd/", UssdGatewayView.as_view(), name="ussd_gateway"),
    path("ussd/simulate/", UssdSimulateView.as_view(), name="ussd_simulate"),
]
