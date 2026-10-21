import base64
import logging
import os
from datetime import datetime

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SANDBOX_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_URL = "https://api.safaricom.co.ke"

# Public Daraja sandbox passkey. Only ever used when MPESA_PASSKEY is unset
# AND MPESA_ENV is "sandbox"; production requires a real passkey.
SANDBOX_PASSKEY = (
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
)
SANDBOX_SHORTCODE = "174379"


def _env(*names: str, default: str = "") -> str:
    """First non-empty value among `names` (env var aliases)."""
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return default


class MpesaGateway:
    def __init__(self):
        # Accept both the MPESA_CONSUMER_* names from infra/.env.example and the
        # bare CONSUMER_* names the Daraja docs use, so either convention works.
        self.consumer_key = _env("MPESA_CONSUMER_KEY", "CONSUMER_KEY")
        self.consumer_secret = _env("MPESA_CONSUMER_SECRET", "CONSUMER_SECRET")
        self.sandbox = _env("MPESA_ENV", default="sandbox").lower() != "live"
        self.business_short_code = _env("MPESA_SHORTCODE")
        self.passkey = _env("MPESA_PASSKEY")
        self.base_url = _env("MPESA_BASE_URL")

        if not self.base_url:
            self.base_url = SANDBOX_URL if self.sandbox else PRODUCTION_URL
        if not self.business_short_code:
            self.business_short_code = (
                SANDBOX_SHORTCODE if self.sandbox else ""
            )
        if not self.passkey:
            if self.sandbox:
                self.passkey = SANDBOX_PASSKEY
            else:
                # Live shortcodes need a real passkey; never fall back to sandbox.
                self.passkey = ""

        if not self.sandbox and not (self.business_short_code and self.passkey):
            self.config_error = (
                "Live M-Pesa needs MPESA_SHORTCODE and MPESA_PASSKEY."
            )
        else:
            self.config_error = ""

    def is_configured(self) -> bool:
        return bool(
            self.consumer_key
            and self.consumer_secret
            and self.business_short_code
            and self.passkey
            and not self.config_error
        )

    def get_access_token(self):
        """Generates the OAuth access token for Daraja API."""
        if not self.is_configured():
            logger.error("M-Pesa credentials missing: %s", self.config_error or "incomplete")
            return None
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(
                url,
                auth=(self.consumer_key, self.consumer_secret),
                timeout=15,
            )
            response.raise_for_status()
            token = response.json().get('access_token')
            return token
        except Exception:
            logger.exception("Could not get an M-Pesa access token")
            return None

    def initiate_stk_push(self, phone_number, amount, callback_url, account_reference="AgriScan", transaction_desc="Payment for AI Services"):
        """Sends an STK Push request to the user's phone."""
        token = self.get_access_token()
        if not token:
            return {"error": "Could not authenticate with M-Pesa"}

        # Format phone number to 254XXXXXXXXX
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif phone_number.startswith('+'):
            phone_number = phone_number[1:]

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.business_short_code}{self.passkey}{timestamp}".encode()).decode()

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": self.business_short_code,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": self.business_short_code,
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"

        try:
            response = requests.post(
                url, headers=headers, json=payload, timeout=20
            )
            return response.json()
        except Exception:
            logger.exception("M-Pesa STK push request failed")
            return {"error": "Could not reach M-Pesa. Please try again."}

    def check_transaction_status(self, checkout_request_id):
        """Queries the status of an STK Push transaction."""
        token = self.get_access_token()
        if not token: return None

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.business_short_code}{self.passkey}{timestamp}".encode()).decode()

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": self.business_short_code,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"

        try:
            response = requests.post(
                url, headers=headers, json=payload, timeout=20
            )
            return response.json()
        except Exception:
            logger.exception("M-Pesa transaction status query failed")
            return {"error": "Could not reach M-Pesa. Please try again."}
