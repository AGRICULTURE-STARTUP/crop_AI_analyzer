from accounts.views import (
    AdminLenderApproveView,
    AdminLenderListView,
    AdminLenderSuspendView,
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
    WalletView,
)
from accounts.chat_views import ChatMessageView

urlpatterns = [
    # Auth
    path("auth/register/farmer/", FarmerRegisterView.as_view(), name="auth_register_farmer"),
    path("auth/register/buyer/", BuyerRegisterView.as_view(), name="auth_register_buyer"),
    path("auth/register/agency/", AgencyRegisterView.as_view(), name="auth_register_agency"),
    path("auth/register/lender/", LenderRegisterView.as_view(), name="auth_register_lender"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    # Current user
    path("me/", MeView.as_view(), name="me"),
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
    # Admin lender moderation
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
]
