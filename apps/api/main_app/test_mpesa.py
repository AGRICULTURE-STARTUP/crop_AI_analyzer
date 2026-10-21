"""M-Pesa wallet top-up: callback idempotency and gateway configuration.

The callback path is the only place real money becomes a wallet balance, and
Safaricom retries callbacks, so the tests below focus on replay safety.
"""

from __future__ import annotations

import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from main_app.models import MpesaTransaction, Wallet


def callback_payload(checkout_request_id: str, result_code: int = 0, receipt: str = "QJG1234") -> str:
    return json.dumps(
        {
            "Body": {
                "stkCallback": {
                    "ResultCode": result_code,
                    "ResultDesc": "0" if result_code == 0 else "Insufficient balance",
                    "CheckoutRequestID": checkout_request_id,
                    "CallbackMetadata": {
                        "Item": [{"Name": "MpesaReceiptNumber", "Value": receipt}]
                    },
                }
            }
        }
    )


@override_settings(DEV_ENV=True)
class MpesaCallbackTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("payer", password="Testpass123!")
        self.wallet = Wallet.objects.get(user=self.user)
        self.txn = MpesaTransaction.objects.create(
            user=self.user,
            phone_number="254700111222",
            amount=Decimal("500.00"),
            checkout_request_id="ws_CO_ABC123",
            merchant_request_id="MR_1",
        )
        self.url = "/mpesa/callback/"

    def _post(self, payload: str, **extra):
        return self.client.post(
            self.url, data=payload, content_type="application/json", **extra
        )

    def test_success_credits_the_wallet_once(self):
        response = self._post(callback_payload("ws_CO_ABC123"))
        self.assertEqual(response.status_code, 200)
        self.wallet.refresh_from_db()
        self.txn.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("500.00"))
        self.assertEqual(self.txn.status, "Success")
        self.assertEqual(self.txn.receipt_number, "QJG1234")

    def test_duplicate_callback_does_not_double_credit(self):
        """Safaricom retries. A replay must be acknowledged, not paid again."""
        self._post(callback_payload("ws_CO_ABC123"))
        self._post(callback_payload("ws_CO_ABC123"))
        self._post(callback_payload("ws_CO_ABC123"))

        self.wallet.refresh_from_db()
        self.txn.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("500.00"))
        self.assertEqual(self.txn.status, "Success")

    def test_late_failure_cannot_overwrite_a_settled_payment(self):
        self._post(callback_payload("ws_CO_ABC123"))
        self._post(callback_payload("ws_CO_ABC123", result_code=1))

        self.txn.refresh_from_db()
        self.wallet.refresh_from_db()
        self.assertEqual(self.txn.status, "Success")
        self.assertEqual(self.wallet.balance, Decimal("500.00"))

    def test_failure_marks_failed_and_leaves_balance(self):
        self._post(callback_payload("ws_CO_ABC123", result_code=1))
        self.txn.refresh_from_db()
        self.wallet.refresh_from_db()
        self.assertEqual(self.txn.status, "Failed")
        self.assertEqual(self.txn.result_desc, "Insufficient balance")
        self.assertEqual(self.wallet.balance, Decimal("0.00"))

    def test_unknown_checkout_request_is_acknowledged(self):
        response = self._post(callback_payload("ws_CO_NEVER_SEEN"))
        self.assertEqual(response.status_code, 200)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("0.00"))

    def test_malformed_payload_does_not_500(self):
        response = self._post("not json at all")
        self.assertEqual(response.status_code, 200)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("0.00"))


@override_settings(DEV_ENV=True)
class MpesaTopupEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("farmer", password="Testpass123!")
        from main_app.models import FarmerProfile

        FarmerProfile.objects.create(
            user=self.user, phone_number="254700111222", county="Nakuru"
        )
        self.client.force_login(self.user)

    def test_unconfigured_gateway_returns_503_without_calling_safaricom(self):
        """No credentials must fail loudly, not raise a confusing 502."""
        with patch("accounts.views.MpesaGateway") as gateway:
            gateway.return_value.is_configured.return_value = False
            gateway.return_value.config_error = "missing credentials"
            with patch("main_app.mpesa_utils.MpesaGateway.initiate_stk_push") as push:
                response = self.client.post(
                    "/api/v1/mpesa/topup/",
                    {"amount": "100", "phone_number": "254700111222"},
                )
        self.assertEqual(response.status_code, 503)
        push.assert_not_called()
        self.assertEqual(MpesaTransaction.objects.count(), 0)

    def test_successful_stk_push_records_a_pending_transaction(self):
        with patch("accounts.views.MpesaGateway") as gateway:
            gateway.return_value.is_configured.return_value = True
            gateway.return_value.config_error = ""
            gateway.return_value.initiate_stk_push.return_value = {
                "CheckoutRequestID": "ws_CO_NEW",
                "MerchantRequestID": "MR_NEW",
            }
            response = self.client.post(
                "/api/v1/mpesa/topup/",
                {"amount": "100", "phone_number": "254700111222"},
            )
        self.assertEqual(response.status_code, 200)
        txn = MpesaTransaction.objects.get(checkout_request_id="ws_CO_NEW")
        self.assertEqual(txn.status, "Pending")
        self.assertEqual(txn.amount, Decimal("100.00"))


class MpesaGatewayConfigTests(TestCase):
    """Env handling: alias names, sandbox defaults, and the live safety rail."""

    def _gateway(self, **env):
        with patch.dict("os.environ", env, clear=True):
            from main_app.mpesa_utils import MpesaGateway

            return MpesaGateway()

    def test_accepts_mpesa_prefixed_credential_names(self):
        gw = self._gateway(
            MPESA_CONSUMER_KEY="key", MPESA_CONSUMER_SECRET="secret"
        )
        self.assertEqual(gw.consumer_key, "key")
        self.assertEqual(gw.consumer_secret, "secret")

    def test_accepts_bare_daraja_credential_names(self):
        gw = self._gateway(CONSUMER_KEY="bare", CONSUMER_SECRET="bare-secret")
        self.assertEqual(gw.consumer_key, "bare")
        self.assertEqual(gw.consumer_secret, "bare-secret")

    def test_prefixed_name_wins_when_both_are_set(self):
        gw = self._gateway(
            MPESA_CONSUMER_KEY="preferred", CONSUMER_KEY="fallback"
        )
        self.assertEqual(gw.consumer_key, "preferred")

    def test_sandbox_defaults_work_without_any_credentials(self):
        gw = self._gateway(MPESA_ENV="sandbox")
        self.assertIn("sandbox.safaricom.co.ke", gw.base_url)
        self.assertTrue(gw.is_configured() is False)  # no consumer key/secret

    def test_live_env_uses_the_production_host(self):
        gw = self._gateway(
            MPESA_ENV="live",
            MPESA_CONSUMER_KEY="k",
            MPESA_CONSUMER_SECRET="s",
            MPESA_SHORTCODE="123456",
            MPESA_PASSKEY="passkey",
        )
        self.assertIn("api.safaricom.co.ke", gw.base_url)
        self.assertNotIn("sandbox", gw.base_url)
        self.assertTrue(gw.is_configured())
        self.assertEqual(gw.config_error, "")

    def test_live_never_falls_back_to_the_sandbox_passkey(self):
        """The public sandbox passkey must never reach a live shortcode."""
        gw = self._gateway(
            MPESA_ENV="live",
            MPESA_CONSUMER_KEY="k",
            MPESA_CONSUMER_SECRET="s",
        )
        self.assertEqual(gw.passkey, "")
        self.assertEqual(gw.business_short_code, "")
        self.assertFalse(gw.is_configured())
        self.assertIn("MPESA_SHORTCODE", gw.config_error)

    def test_live_with_credentials_is_fully_configured(self):
        gw = self._gateway(
            MPESA_ENV="live",
            MPESA_CONSUMER_KEY="k",
            MPESA_CONSUMER_SECRET="s",
            MPESA_SHORTCODE="600000",
            MPESA_PASSKEY="passkey",
        )
        self.assertTrue(gw.is_configured())