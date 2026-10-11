"""Crop recommender: engine parity with the Panda Smart model + API contracts."""

from __future__ import annotations

import csv
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from main_app.models import FarmerProfile
from recommend import engine
from recommend.crops import CROP_SLUGS, crop_meta
from recommend.models import CropRecommendation

RICE_ROW = {
    "N": 90, "P": 42, "K": 43, "temperature": 20.88,
    "humidity": 82.0, "ph": 6.5, "rainfall": 202.94,
}


class EngineTests(SimpleTestCase):
    def test_model_covers_all_crops(self):
        model = engine.load_model()
        self.assertEqual(model["classes"], list(CROP_SLUGS))
        self.assertGreater(model["accuracy"], 0.99)
        for slug in CROP_SLUGS:
            self.assertIsNotNone(crop_meta(slug))
            self.assertIn("rainfall", engine.crop_stats(slug))

    def test_ranks_known_row_and_probabilities_sum_to_one(self):
        ranked = engine.rank_crops(RICE_ROW, top=len(CROP_SLUGS))
        self.assertEqual(ranked[0][0], "rice")
        self.assertAlmostEqual(sum(p for _, p in ranked), 1.0, places=6)
        self.assertEqual(ranked, sorted(ranked, key=lambda r: r[1], reverse=True))

    def test_matches_dataset_labels(self):
        """Same behaviour as the original model: ~99% of dataset rows classified right."""
        with (engine.MODEL_PATH.parent / "Crop_recommendation.csv").open(encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        hits = sum(
            engine.rank_crops({f: float(r[f]) for f in engine.FEATURES}, top=1)[0][0]
            == r["label"].strip()
            for r in rows
        )
        self.assertGreater(hits / len(rows), 0.99)

    def test_fit_report_and_range_warnings(self):
        report = {item["feature"]: item for item in engine.fit_report(RICE_ROW, "rice")}
        self.assertEqual(report["humidity"]["status"], "ok")
        flagged = engine.out_of_range({**RICE_ROW, "rainfall": 900})
        self.assertEqual([f["feature"] for f in flagged], ["rainfall"])


@override_settings(DEV_ENV=True)
class RecommendApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user("grower", password="pass12345")
        FarmerProfile.objects.create(user=self.farmer, county="Nakuru")
        self.other = User.objects.create_user("other", password="pass12345")
        self.admin = User.objects.create_user("boss", password="pass12345", is_staff=True)

    def test_anonymous_recommendation_is_not_saved(self):
        response = self.client.post("/api/v1/recommend/", RICE_ROW, format="json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["top"]["slug"], "rice")
        self.assertEqual(len(body["results"]), 3)
        self.assertEqual(body["top"]["in_range"], engine.in_range_count(RICE_ROW, "rice"))
        self.assertFalse(body["saved"])
        self.assertEqual(len(body["fit"]), 7)
        self.assertEqual(CropRecommendation.objects.count(), 0)

    def test_invalid_input_is_rejected(self):
        for payload in ({**RICE_ROW, "ph": 20}, {"N": 10}, {**RICE_ROW, "humidity": "wet"}):
            with self.subTest(payload=payload):
                response = self.client.post("/api/v1/recommend/", payload, format="json")
                self.assertEqual(response.status_code, 400)

    def test_signed_in_runs_are_saved_and_private(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            "/api/v1/recommend/", {**RICE_ROW, "location": "Mwea"}, format="json"
        )
        self.assertTrue(response.json()["saved"])
        record_id = response.json()["id"]

        history = self.client.get("/api/v1/recommend/history/").json()["results"]
        self.assertEqual([h["id"] for h in history], [record_id])
        self.assertEqual(history[0]["top"]["slug"], "rice")

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/v1/recommend/history/").json()["results"], [])
        self.assertEqual(
            self.client.delete(f"/api/v1/recommend/history/{record_id}/").status_code, 404
        )

        self.client.force_authenticate(self.farmer)
        self.assertEqual(
            self.client.delete(f"/api/v1/recommend/history/{record_id}/").status_code, 204
        )
        self.assertFalse(CropRecommendation.objects.exists())

    def test_history_needs_sign_in(self):
        self.assertEqual(self.client.get("/api/v1/recommend/history/").status_code, 401)

    def test_crop_catalog_is_public(self):
        body = self.client.get("/api/v1/recommend/crops/").json()
        self.assertEqual(len(body["crops"]), 22)
        self.assertEqual(self.client.get("/api/v1/recommend/crops/maize/").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/recommend/crops/tea/").status_code, 404)

    @patch.dict("os.environ", {"OPEN_WEATHER_API_KEY": "test-key"})
    @patch("recommend.weather.requests.get")
    def test_weather_prefill_uses_profile_county(self, mock_get):
        current = MagicMock()
        current.json.return_value = {
            "name": "Nakuru",
            "main": {"temp": 21.4, "humidity": 77},
            "weather": [{"description": "light rain"}],
        }
        forecast = MagicMock()
        forecast.json.return_value = {
            "list": [{"rain": {"3h": 1.0}}] * 40  # 5 days of 3-hour slots
        }
        mock_get.side_effect = [current, forecast]

        self.client.force_authenticate(self.farmer)
        weather = self.client.get("/api/v1/recommend/weather/").json()["weather"]
        self.assertEqual(weather["location"], "Nakuru")
        self.assertEqual(weather["humidity"], 77)
        self.assertEqual(weather["rainfall"], 240)  # 40 mm over 5 days -> 30 days
        self.assertEqual(mock_get.call_args_list[0].kwargs["params"]["q"], "Nakuru,Kenya")

    def test_admin_stats_are_staff_only(self):
        self.client.force_authenticate(self.farmer)
        self.client.post("/api/v1/recommend/", RICE_ROW, format="json")
        self.assertEqual(self.client.get("/api/v1/admin/recommendations/").status_code, 403)
        self.client.force_authenticate(self.admin)
        body = self.client.get("/api/v1/admin/recommendations/").json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["top_crops"][0]["slug"], "rice")
