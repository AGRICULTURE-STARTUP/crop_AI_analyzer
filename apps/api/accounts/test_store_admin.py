"""Public storefront + admin console API contracts."""

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import AgencyProduct, AgencyProfile
from main_app.models import FarmerProfile


@override_settings(DEV_ENV=True)
class StorefrontTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        agency_user = User.objects.create_user("agrovet", password="pass12345")
        self.agency = AgencyProfile.objects.create(
            user=agency_user, agency_name="Shamba Supplies", phone="0700111222", county="Nakuru"
        )
        other_user = User.objects.create_user("seeds", password="pass12345")
        self.other = AgencyProfile.objects.create(
            user=other_user, agency_name="Seed Hub", phone="0711222333", county="Kiambu"
        )
        self.dap = AgencyProduct.objects.create(
            agency=self.agency, name="DAP fertiliser", category="fertiliser",
            price=Decimal("3500"), unit="50kg bag",
        )
        self.can = AgencyProduct.objects.create(
            agency=self.agency, name="CAN top dressing", category="fertiliser",
            price=Decimal("2800"), unit="50kg bag",
        )
        self.seed = AgencyProduct.objects.create(
            agency=self.other, name="Hybrid maize seed", category="seed",
            price=Decimal("650"), unit="2kg",
        )
        AgencyProduct.objects.create(
            agency=self.other, name="Old stock", category="seed", is_available=False
        )
        AgencyProduct.objects.create(
            agency=self.other, name="Flagged listing", category="seed", is_hidden=True
        )
        self.farmer = User.objects.create_user("farmer", password="pass12345")
        FarmerProfile.objects.create(user=self.farmer)

    def test_anonymous_can_browse_but_not_see_phone_numbers(self):
        body = self.client.get("/api/v1/store/products/").json()
        names = {p["name"] for p in body["results"]}
        self.assertEqual(names, {"DAP fertiliser", "CAN top dressing", "Hybrid maize seed"})
        self.assertTrue(all(p["seller"]["phone"] is None for p in body["results"]))
        self.assertFalse(body["contact_visible"])
        counts = {c["value"]: c["count"] for c in body["facets"]["categories"]}
        self.assertEqual(counts["fertiliser"], 2)
        self.assertEqual(counts["seed"], 1)

    def test_signed_in_users_see_contacts(self):
        self.client.force_authenticate(self.farmer)
        body = self.client.get(f"/api/v1/store/products/{self.dap.id}/").json()
        self.assertEqual(body["seller"]["phone"], "0700111222")
        self.assertEqual([p["name"] for p in body["related"]], ["CAN top dressing"])
        self.assertEqual(body["seller"]["product_count"], 2)

    def test_filters_sort_and_pagination(self):
        body = self.client.get(
            "/api/v1/store/products/?category=fertiliser&sort=price_asc"
        ).json()
        self.assertEqual([p["name"] for p in body["results"]], ["CAN top dressing", "DAP fertiliser"])
        body = self.client.get("/api/v1/store/products/?max_price=1000").json()
        self.assertEqual([p["name"] for p in body["results"]], ["Hybrid maize seed"])
        body = self.client.get("/api/v1/store/products/?county=kiambu").json()
        self.assertEqual(body["count"], 1)
        body = self.client.get("/api/v1/store/products/?page_size=2&page=2&sort=name").json()
        self.assertEqual((body["page"], body["pages"], len(body["results"])), (2, 2, 1))
        body = self.client.get("/api/v1/store/products/?min_price=abc&page=99").json()
        self.assertEqual(body["count"], 3)

    def test_hidden_and_unavailable_products_are_not_public(self):
        hidden = AgencyProduct.objects.get(name="Flagged listing")
        unavailable = AgencyProduct.objects.get(name="Old stock")
        for product in (hidden, unavailable):
            response = self.client.get(f"/api/v1/store/products/{product.id}/")
            self.assertEqual(response.status_code, 404)
        self.client.force_authenticate(self.farmer)
        names = {p["name"] for p in self.client.get("/api/v1/inputs/products/").json()["products"]}
        self.assertNotIn("Flagged listing", names)


@override_settings(DEV_ENV=True)
class FarmerOverviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user("grower", password="pass12345")
        FarmerProfile.objects.create(user=self.farmer, county="Nakuru", products="Maize, Beans")
        self.buyer = User.objects.create_user("buyer", password="pass12345")

    def test_overview_for_farmer_only(self):
        self.assertEqual(self.client.get("/api/v1/farmer/overview/").status_code, 401)
        self.client.force_authenticate(self.buyer)
        self.assertEqual(self.client.get("/api/v1/farmer/overview/").status_code, 403)
        self.client.force_authenticate(self.farmer)
        body = self.client.get("/api/v1/farmer/overview/").json()
        self.assertEqual(body["farm"]["crops"], ["Maize", "Beans"])
        self.assertEqual(body["scans"]["total"], 0)
        self.assertIsNone(body["advisor"]["last"])
        self.assertEqual(body["wallet"]["free_scans_left"], 2)


@override_settings(DEV_ENV=True)
class AdminConsoleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("boss", password="pass12345", is_staff=True)
        self.farmer = User.objects.create_user("farmer", password="pass12345")
        FarmerProfile.objects.create(user=self.farmer, county="Nakuru")
        agency_user = User.objects.create_user("agrovet", password="pass12345")
        agency = AgencyProfile.objects.create(
            user=agency_user, agency_name="Shamba Supplies", phone="0700", county="Nakuru"
        )
        self.product = AgencyProduct.objects.create(agency=agency, name="DAP", category="fertiliser")

    def test_endpoints_are_staff_only(self):
        paths = ["/api/v1/admin/overview/", "/api/v1/admin/users/", "/api/v1/admin/products/"]
        for path in paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)
                self.client.force_authenticate(self.farmer)
                self.assertEqual(self.client.get(path).status_code, 403)
                self.client.force_authenticate(self.admin)
                self.assertEqual(self.client.get(path).status_code, 200)
                self.client.force_authenticate(None)

    def test_overview_shape(self):
        self.client.force_authenticate(self.admin)
        body = self.client.get("/api/v1/admin/overview/").json()
        self.assertEqual(body["kpis"]["users_total"], 3)
        self.assertEqual(len(body["series"]["signups"]), 30)
        self.assertEqual(body["series"]["signups"][-1]["value"], 3.0)
        roles = {r["role"]: r["count"] for r in body["breakdown"]["roles"]}
        self.assertEqual((roles["farmer"], roles["agency"], roles["admin"]), (1, 1, 1))

    def test_user_list_filters_and_suspend(self):
        self.client.force_authenticate(self.admin)
        body = self.client.get("/api/v1/admin/users/?role=farmer").json()
        self.assertEqual([u["username"] for u in body["results"]], ["farmer"])
        self.assertEqual(body["role_totals"]["agency"], 1)

        url = f"/api/v1/admin/users/{self.farmer.id}/active/"
        response = self.client.post(url, {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.farmer.refresh_from_db()
        self.assertFalse(self.farmer.is_active)
        self.assertEqual(self.client.post(url, {"is_active": "no"}, format="json").status_code, 400)
        own = f"/api/v1/admin/users/{self.admin.id}/active/"
        self.assertEqual(self.client.post(own, {"is_active": False}, format="json").status_code, 400)

    def test_hide_and_restore_listing(self):
        self.client.force_authenticate(self.admin)
        url = f"/api/v1/admin/products/{self.product.id}/visibility/"
        self.assertTrue(self.client.post(url, {"is_hidden": True}, format="json").json()["is_hidden"])
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/v1/store/products/{self.product.id}/").status_code, 404)
        self.client.force_authenticate(self.admin)
        hidden = self.client.get("/api/v1/admin/products/?status=hidden").json()
        self.assertEqual(hidden["count"], 1)
        self.client.post(url, {"is_hidden": False}, format="json")
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/v1/store/products/{self.product.id}/").status_code, 200)

    def test_suspended_user_is_locked_out(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            f"/api/v1/admin/users/{self.farmer.id}/active/", {"is_active": False}, format="json"
        )
        self.client.force_authenticate(None)
        response = self.client.post(
            "/api/v1/auth/login/", {"username": "farmer", "password": "pass12345"}, format="json"
        )
        self.assertEqual(response.status_code, 401)
