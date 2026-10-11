"""Weather values for the recommender: current temperature and humidity, plus a
month-of-rain estimate from the OpenWeather 5-day forecast (same idea as the
Panda Smart app, without its random fill-ins: no rain forecast means 0 mm)."""

from __future__ import annotations

import logging
import os

import requests

logger = logging.getLogger(__name__)

BASE = "https://api.openweathermap.org/data/2.5"


def recommendation_weather(location: str, country: str = "Kenya") -> dict | None:
    api_key = os.getenv("OPEN_WEATHER_API_KEY")
    place = (location or "").strip()
    if not api_key or not place:
        return None
    query = place if not country or country.lower() in place.lower() else f"{place},{country}"
    params = {"q": query, "appid": api_key, "units": "metric"}
    try:
        current = requests.get(f"{BASE}/weather", params=params, timeout=8)
        current.raise_for_status()
        now = current.json()
        forecast = requests.get(f"{BASE}/forecast", params=params, timeout=8)
        forecast.raise_for_status()
        slots = forecast.json().get("list") or []
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Recommendation weather failed for %s: %s", query, exc)
        return None

    main = now.get("main") or {}
    if "temp" not in main or "humidity" not in main:
        return None
    rain_total = sum(float((slot.get("rain") or {}).get("3h", 0) or 0) for slot in slots)
    days_covered = (len(slots) * 3 / 24) or 5
    description = ((now.get("weather") or [{}])[0] or {}).get("description", "")
    return {
        "location": now.get("name") or place,
        "temperature": round(float(main["temp"]), 1),
        "humidity": round(float(main["humidity"])),
        "rainfall": round(rain_total / days_covered * 30),
        "rainfall_basis": "Estimated for 30 days from the 5-day forecast",
        "description": description,
    }
