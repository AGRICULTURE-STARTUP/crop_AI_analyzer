"""Contract tests for lending M2M score API + USSD simulate gateway."""

from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import AccessToken

from accounts.keys import generate_raw_api_key, hash_api_key, key_prefix
from accounts.models import AgencyProduct, AgencyProfile, LendingAPIKey, LendingPartnerProfile
from accounts.serializers import issue_tokens
from accounts.session_activity import invalidate_session, session_id_for_token
from main_app.models import (
    BuyerProfile,
    FarmerProfile,
    FarmHealthProfile,
    PartnerAPIKey,
)
from scanner.models import ScanJob


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
            products="Maize, tomato",
            farm_size_acres="2.50",
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
        body = res.json()
        self.assertIn("health_score", body)
        self.assertEqual(body["county"], "Nakuru")
        self.assertEqual(body["farm_size_acres"], 2.5)
        self.assertEqual(body["crops"], "Maize, tomato")

    def test_score_omits_empty_farm_fields(self):
        # Use queryset.update to avoid FarmerProfile post_save re-saving a
        # stale cached health_profile and wiping opt_in_for_lending.
        FarmerProfile.objects.filter(pk=self.farmer.pk).update(
            products="", farm_size_acres=None
        )
        res = self.client.get(
            "/api/v1/lending/score/",
            {"phone": "254712345678"},
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIsNone(body["farm_size_acres"])
        self.assertIsNone(body["crops"])

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


@override_settings(DEV_ENV=True)
class RoleAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer_user = User.objects.create_user("farmer", password="pass12345")
        FarmerProfile.objects.create(user=self.farmer_user, county="Nakuru")
        self.other_farmer = User.objects.create_user("farmer2", password="pass12345")
        FarmerProfile.objects.create(user=self.other_farmer, county="Kiambu")

        self.buyer_user = User.objects.create_user("buyer", password="pass12345")
        BuyerProfile.objects.create(user=self.buyer_user)

        self.agency_user = User.objects.create_user("agency", password="pass12345")
        self.agency = AgencyProfile.objects.create(
            user=self.agency_user,
            agency_name="Inputs Ltd",
            phone="0700000000",
            county="Nakuru",
        )
        self.other_agency_user = User.objects.create_user(
            "agency2", password="pass12345"
        )
        self.other_agency = AgencyProfile.objects.create(
            user=self.other_agency_user,
            agency_name="Other Inputs",
            phone="0711111111",
            county="Kiambu",
        )

        self.lender_user = User.objects.create_user("lender", password="pass12345")
        LendingPartnerProfile.objects.create(
            user=self.lender_user,
            organization_name="MFI",
            organization_type="mfi",
            verification_status="approved",
        )
        self.admin_user = User.objects.create_user(
            "admin", password="pass12345", is_staff=True
        )

    def get_as(self, user, path):
        self.client.force_authenticate(user)
        response = self.client.get(path)
        self.client.force_authenticate(None)
        return response

    def test_farmer_features_reject_other_roles(self):
        farmer_paths = [
            "/api/v1/crops/",
            "/api/v1/scans/",
            "/api/v1/wallet/",
            "/api/v1/inputs/agencies/",
            "/api/v1/inputs/products/",
            "/api/v1/market/buyers/",
        ]
        for path in farmer_paths:
            with self.subTest(path=path):
                self.assertEqual(self.get_as(self.farmer_user, path).status_code, 200)
                for denied_user in (
                    self.buyer_user,
                    self.agency_user,
                    self.lender_user,
                ):
                    self.assertEqual(
                        self.get_as(denied_user, path).status_code,
                        403,
                    )

    def test_buyer_directory_rejects_other_roles(self):
        path = "/api/v1/market/farmers/"
        self.assertEqual(self.get_as(self.buyer_user, path).status_code, 200)
        for denied_user in (
            self.farmer_user,
            self.agency_user,
            self.lender_user,
        ):
            self.assertEqual(self.get_as(denied_user, path).status_code, 403)

    def test_agency_cannot_delete_another_agencys_product(self):
        product = AgencyProduct.objects.create(
            agency=self.other_agency,
            name="Private listing",
        )
        self.client.force_authenticate(self.agency_user)
        response = self.client.delete(
            f"/api/v1/inputs/my-products/{product.id}/"
        )
        self.assertEqual(response.status_code, 404)
        self.assertTrue(AgencyProduct.objects.filter(pk=product.pk).exists())

    def test_scan_detail_hides_another_users_job(self):
        job = ScanJob.objects.create(
            user=self.other_farmer,
            crop="maize",
            image="scan_jobs/private.jpg",
        )
        self.client.force_authenticate(self.farmer_user)
        response = self.client.get(f"/api/v1/scans/{job.id}/")
        self.assertEqual(response.status_code, 404)

    def test_admin_revenue_is_staff_only(self):
        path = "/api/v1/admin/revenue/"
        self.assertEqual(self.get_as(self.admin_user, path).status_code, 200)
        for denied_user in (
            self.farmer_user,
            self.buyer_user,
            self.agency_user,
            self.lender_user,
        ):
            self.assertEqual(self.get_as(denied_user, path).status_code, 403)

    def test_cross_role_mutations_and_costly_actions_are_denied(self):
        cases = [
            (self.buyer_user, "/api/v1/chat/messages/", {"message": "help"}),
            (
                self.agency_user,
                "/api/v1/mpesa/topup/",
                {"amount": "100", "phone_number": "254700000000"},
            ),
            (
                self.farmer_user,
                "/api/v1/inputs/my-products/",
                {"name": "Unauthorized listing"},
            ),
            (
                self.farmer_user,
                "/api/v1/admin/lenders/1/approve/",
                {},
            ),
        ]
        for user, path, payload in cases:
            with self.subTest(path=path):
                self.client.force_authenticate(user)
                response = self.client.post(path, payload, format="json")
                self.assertEqual(response.status_code, 403)

    def test_anonymous_users_cannot_access_any_portal_api(self):
        for path in (
            "/api/v1/me/",
            "/api/v1/scans/",
            "/api/v1/market/farmers/",
            "/api/v1/inputs/my-products/",
            "/api/v1/lender/api-keys/",
            "/api/v1/admin/revenue/",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)


@override_settings(DEV_ENV=True)
class JwtIdleSessionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user("idle-user", password="pass12345")
        FarmerProfile.objects.create(user=self.user)
        self.tokens = issue_tokens(self.user)
        self.access = AccessToken(self.tokens["access"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

    def test_active_session_authenticates(self):
        self.assertEqual(self.client.get("/api/v1/me/").status_code, 200)

    def test_idle_session_is_rejected(self):
        invalidate_session(session_id_for_token(self.access))
        response = self.client.get("/api/v1/me/")
        self.assertEqual(response.status_code, 401)
        self.assertIn("30 minutes", str(response.json()))

    def test_logout_invalidates_access_and_refresh_tokens(self):
        response = self.client.post(
            "/api/v1/auth/logout/",
            {"refresh": self.tokens["refresh"]},
            format="json",
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/v1/me/").status_code, 401)
        self.client.credentials()
        refresh_response = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": self.tokens["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, 401)


@override_settings(DEV_ENV=False)
class AuthenticationThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        rates = {**ScopedRateThrottle.THROTTLE_RATES, "auth": "2/min"}
        rate_patch = patch.object(ScopedRateThrottle, "THROTTLE_RATES", rates)
        rate_patch.start()
        self.addCleanup(rate_patch.stop)

    def test_login_attempts_are_throttled(self):
        statuses = [
            self.client.post(
                "/api/v1/auth/login/",
                {"username": "missing", "password": "wrong"},
                format="json",
                REMOTE_ADDR="192.0.2.10",
            ).status_code
            for _ in range(3)
        ]
        self.assertEqual(statuses[:2], [401, 401])
        self.assertEqual(statuses[2], 429)
