"""Generate a structured Groq advisory report after crop-model diagnosis.

Grounds advice in RAG (Chroma / Data PDFs) and OpenWeather for the farmer's county.
"""

from __future__ import annotations

import json
import logging
import os
import re

logger = logging.getLogger(__name__)

REPORT_KEYS = (
    "disease",
    "crop",
    "health_status",
    "confidence_pct",
    "location",
    "cause",
    "symptoms",
    "remedy",
    "medicine",
    "prevention",
    "weather_note",
    "local_tip",
)


def _looks_healthy(label: str) -> bool:
    text = (label or "").lower().replace("_", " ").replace("-", " ")
    return any(
        token in text
        for token in ("healthy", "normal", "no disease", "disease free")
    )


def _fallback_report(
    crop: str,
    label: str,
    confidence: float,
    *,
    location: str = "",
) -> dict:
    healthy = _looks_healthy(label)
    confidence_pct = round(float(confidence) * 100, 1)
    base = {
        "disease": label,
        "crop": crop,
        "health_status": "healthy" if healthy else "diseased",
        "confidence_pct": confidence_pct,
        "location": location or "",
        "weather": None,
        "weather_note": "",
        "cause": "",
        "symptoms": "",
        "remedy": "",
        "medicine": [],
        "prevention": [],
        "local_tip": "",
    }
    if healthy:
        base.update(
            {
                "cause": "No disease detected by the crop model.",
                "symptoms": "Leaf appears within normal range for this crop.",
                "remedy": "Continue regular scouting and good agronomic practice.",
                "prevention": [
                    "Keep fields weed-free and well drained.",
                    "Use clean seed and rotate crops where possible.",
                    "Scout weekly for early leaf spots or pests.",
                ],
                "local_tip": "Re-scan if new spots, yellowing, or wilting appear.",
            }
        )
    else:
        base.update(
            {
                "cause": "See treatment advice once knowledge base / weather context is available.",
                "symptoms": f"Model classified this {crop} leaf as {label}.",
                "remedy": "Isolate affected plants and seek local agrovet guidance.",
                "medicine": [
                    "Ask your local agrovet for products registered for this crop disease."
                ],
                "prevention": [
                    "Remove heavily infected leaves.",
                    "Avoid overhead watering late in the day.",
                    "Follow recommended spacing for airflow.",
                ],
                "local_tip": "Take another clear photo if confidence is low, or ask AgriBot for more detail.",
            }
        )
    return base


def _extract_json(text: str) -> dict:
    raw = (text or "").strip()
    if "```" in raw:
        chunk = raw.split("```")[1]
        if chunk.lstrip().startswith("json"):
            chunk = chunk.lstrip()[4:]
        raw = chunk.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _fetch_weather(location: str, country: str = "Kenya") -> dict | None:
    if not location.strip():
        return None
    try:
        from main_app.utils_weather import get_weather_data

        query = location.strip()
        if country and country.lower() not in query.lower():
            query = f"{query},{country}"
        raw = get_weather_data(query)
        data = json.loads(raw) if isinstance(raw, str) else raw
        if not isinstance(data, dict) or data.get("error"):
            # Retry without country suffix (some county names resolve better alone).
            if "," in query:
                raw2 = get_weather_data(location.strip())
                data = json.loads(raw2) if isinstance(raw2, str) else raw2
            if not isinstance(data, dict) or data.get("error"):
                logger.warning("Weather lookup failed for %s: %s", query, data)
                return None
        return {
            "location": data.get("location") or location,
            "temperature_celsius": data.get("temperature_celsius"),
            "humidity_percent": data.get("humidity_percent"),
            "wind_speed_m_s": data.get("wind_speed_m_s"),
            "rainfall_1h_mm": data.get("rainfall_1h_mm", 0),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Weather fetch error: %s", exc)
        return None


def _fetch_rag_context(crop: str, label: str) -> str:
    query = f"{crop} {label} disease symptoms cause treatment fungicide prevention"
    try:
        from rag.retrieve import retrieve_context

        context_text, docs = retrieve_context(query)
        if not context_text:
            return ""
        # Cap prompt size for Groq.
        text = context_text.strip()
        if len(text) > 4500:
            text = text[:4500] + "\n…[truncated]"
        logger.info("RAG returned %s docs for scan report (%s / %s)", len(docs), crop, label)
        return text
    except Exception as exc:  # noqa: BLE001
        logger.warning("RAG retrieve failed for scan report: %s", exc)
        return ""


def generate_scan_report(
    crop: str,
    label: str,
    confidence: float,
    *,
    location: str | None = None,
    country: str | None = None,
) -> dict:
    """
    Call Groq with diagnosis + farmer county weather + RAG snippets.
    Returns structured advisory JSON (stored on ScanJob.report; not shown raw in UI).
    """
    loc = (location or "").strip()
    ctry = (country or "Kenya").strip() or "Kenya"
    location_label = f"{loc}, {ctry}" if loc else ctry

    base = _fallback_report(crop, label, confidence, location=location_label)
    weather = _fetch_weather(loc, ctry) if loc else None
    if weather:
        base["weather"] = weather
    rag_context = _fetch_rag_context(crop, label)

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.warning("GROQ_API_KEY missing; using fallback scan report")
        if weather:
            base["weather_note"] = (
                "Use current local weather when timing sprays; avoid spraying in heavy rain."
            )
        return base

    healthy = _looks_healthy(label)
    weather_block = (
        json.dumps(weather, ensure_ascii=False)
        if weather
        else "Weather data unavailable for this location."
    )
    rag_block = rag_context or "No knowledge-base snippets were retrieved for this crop/disease."

    system_prompt = """You are AgriScan, an expert agronomist for East African smallholder farmers.
You MUST ground advice in the provided RAG CONTEXT and WEATHER DATA.
Do NOT invent chemical rates, product brands, or disease facts that are not supported by the context.
If the RAG context is thin or missing, say so briefly and give only cautious general practice (scout, remove infected leaves, ask agrovet).

Return ONLY valid JSON (no markdown) with exactly these keys:
disease (string),
crop (string),
health_status ("healthy" or "diseased"),
confidence_pct (number),
location (string — farmer county/country),
cause (short string grounded in RAG when possible),
symptoms (short string),
remedy (short practical steps; tailor timing to weather when relevant),
medicine (array of short generic product/type suggestions a farmer can ask for at an agrovet),
prevention (array of short strings),
weather_note (short string: how current weather affects this disease / spray timing; empty if no weather),
local_tip (one short tip for this farmer's location).

Keep language plain and actionable. Prefer generic medicine classes over brand names.
If health_status is healthy, medicine may be an empty array.
"""
    human = (
        f"Crop: {crop}\n"
        f"Model diagnosis label: {label}\n"
        f"Model confidence (0-1): {confidence:.4f}\n"
        f"Likely healthy: {healthy}\n"
        f"Farmer location: {location_label}\n"
        f"WEATHER DATA (JSON):\n{weather_block}\n\n"
        f"RAG CONTEXT (from farm knowledge base / Data PDFs):\n{rag_block}\n\n"
        "Write the full short advisory report as JSON, grounded in the context above."
    )

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            model=os.getenv("GROQ_SCAN_MODEL", "openai/gpt-oss-120b"),
            groq_api_key=api_key,
            temperature=0.2,
        )
        result = llm.invoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=human)]
        )
        content = result.content if hasattr(result, "content") else str(result)
        parsed = _extract_json(content)
        report = {**base}
        for key in REPORT_KEYS:
            if key in parsed and parsed[key] not in (None, ""):
                report[key] = parsed[key]
        report["crop"] = crop
        report["disease"] = report.get("disease") or label
        report["confidence_pct"] = round(float(confidence) * 100, 1)
        report["location"] = location_label
        report["weather"] = weather
        if report.get("health_status") not in ("healthy", "diseased"):
            report["health_status"] = "healthy" if healthy else "diseased"
        if not isinstance(report.get("medicine"), list):
            report["medicine"] = [str(report["medicine"])] if report.get("medicine") else []
        if not isinstance(report.get("prevention"), list):
            report["prevention"] = (
                [str(report["prevention"])] if report.get("prevention") else []
            )
        return report
    except Exception as exc:  # noqa: BLE001
        logger.exception("Groq scan report failed: %s", exc)
        base["local_tip"] = (
            f"{base.get('local_tip', '')} (Advisory fallback used: {str(exc)[:120]})"
        ).strip()
        return base
