import requests
import json
import base64
from datetime import datetime
from django.conf import settings
import os
from dotenv import load_dotenv

load_dotenv()

class MpesaGateway:
    def __init__(self):
        self.consumer_key = os.getenv('CONSUMER_KEY')
        self.consumer_secret = os.getenv('CONSUMER_SECRET')
        self.business_short_code = os.getenv('MPESA_SHORTCODE', '174379') # Sandbox default
        self.passkey = os.getenv('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919') # Sandbox default
        self.base_url = "https://sandbox.safaricom.co.ke" # Change to api.safaricom.co.ke for production
        
    def get_access_token(self):
        """Generates the OAuth access token for Daraja API."""
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(url, auth=(self.consumer_key, self.consumer_secret))
            response.raise_for_status()
            token = response.json().get('access_token')
            return token
        except Exception as e:
            print(f"Error getting M-Pesa access token: {e}")
            return None

    def initiate_stk_push(self, phone_number, amount, callback_url, account_reference="UkulimaBora", transaction_desc="Payment for AI Services"):
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

        url = f"{self.base_url}/mpesa/stkpush/v1/query" # This is wrong, should be v1/processrequest
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

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
            response = requests.post(url, headers=headers, json=payload)
            return response.json()
        except Exception as e:
            return {"error": str(e)}
