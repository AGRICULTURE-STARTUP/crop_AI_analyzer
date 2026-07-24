"""Contract tests for lending M2M score API + USSD simulate gateway."""

from __future__ import annotations

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.keys import generate_raw_api_key, hash_api_key, key_prefix
from accounts.models import LendingAPIKey, LendingPartnerProfile
from main_app.models import FarmerProfile, FarmHealthProfile, PartnerAPIKey


@override_settings(DEV_ENV=True)
class LendingScoreContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lender_user = User.objects.create_user(
            username="mfi", email="mfi@test.com", password="pass12345"
        )
        self.partner = LendingPartnerProfile.objects.create(
            user=self.lender_user,
            organization_name="Test MFI",
            organization_type="mfi",
            verification_status="approved",
        )
        self.raw_key = generate_raw_api_key()
        self.api_key = LendingAPIKey.objects.create(
            partner=self.partner,
            name="Prod",
            key_prefix=key_prefix(self.raw_key),
            key_hash=hash_api_key(self.raw_key),
            is_active=True,
        )

        self.farmer_user = User.objects.create_user(
            username="farmer1", email="f@test.com", password="pass12345"
        )
        self.farmer = FarmerProfile.objects.create(
            user=self.farmer_user,
            phone_number="254712345678",
            county="Nakuru",
        )
        hp, _ = FarmHealthProfile.objects.get_or_create(farmer=self.farmer)
        hp.opt_in_for_lending = True
        hp.health_score = 710
        hp.risk_tier = "Low Risk"
        hp.save()

    def test_score_requires_bearer(self):
        res = self.client.get("/api/v1/lending/score/", {"phone": "254712345678"})
        self.assertEqual(res.status_code, 401)

    def test_score_with_lending_api_key(self):
        res = self.client.get(
            "/api/v1/lending/score/",
            {"phone": "254712345678"},
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("health_score", res.json())
        self.assertEqual(res.json()["county"], "Nakuru")

    def test_score_rejects_without_consent(self):
        hp = self.farmer.health_profile
        hp.opt_in_for_lending = False
        hp.save()
        res = self.client.get(
            "/api/v1/lending/score/",
            {"phone": "254712345678"},
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(res.status_code, 403)

    def test_score_rejects_pending_partner(self):
        self.partner.verification_status = "pending"
        self.partner.save()
        res = self.client.get(
            "/api/v1/lending/score/",
            {"phone": "254712345678"},
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(res.status_code, 401)

    def test_legacy_partner_api_key_still_works(self):
        legacy = PartnerAPIKey.objects.create(
            partner_name="Old Bank", api_key="legacy-plain-key", is_active=True
        )
        res = self.client.get(
            "/api/v1/lending/score/",
            {"phone": "254712345678"},
            HTTP_AUTHORIZATION=f"Bearer {legacy.api_key}",
        )
        self.assertEqual(res.status_code, 200)


@override_settings(DEV_ENV=True)
class UssdSimulateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_meta_get(self):
        res = self.client.get("/api/v1/ussd/simulate/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("crop_scan", res.json()["excluded"])

    def test_main_menu(self):
        res = self.client.post(
            "/api/v1/ussd/simulate/",
            {
                "session_id": "test-1",
                "phone_number": "254700000000",
                "text": "",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertFalse(body["end"])
        self.assertIn("Wallet", body["message"])
        self.assertTrue(body["response"].startswith("CON "))

    def test_wallet_demo(self):
        res = self.client.post(
            "/api/v1/ussd/simulate/",
            {
                "session_id": "test-2",
                "phone_number": "254700000000",
                "text": "1",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["end"])
        self.assertIn("DEMO wallet", res.json()["message"])
