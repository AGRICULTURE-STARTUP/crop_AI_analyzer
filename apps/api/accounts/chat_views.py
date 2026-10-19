"""Thin AgriBot JSON API for the Next.js SPA."""

from __future__ import annotations

import json
import logging
import os

from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsFarmer

logger = logging.getLogger(__name__)


_DEFINITIONAL_PREFIXES = (
    "what is ",
    "what's ",
    "whats ",
    "what are ",
    "define ",
    "definition of ",
    "meaning of ",
    "ni nini ",
    "eleza ",
    "maana ya ",
)

# If these appear, keep structured advisory sections even for "what is …" questions.
_ADVISORY_HINTS = (
    "blight",
    "disease",
    "pest",
    "fungus",
    "wilt",
    "yellow",
    "treat",
    "fertiliz",
    "irrigat",
    "how to",
    "ugonjwa",
    "wadudu",
    "tiba",
    "mbolea",
)


def _is_definitional_question(message: str) -> bool:
    """True for short 'what is X' style questions that need a direct answer only."""
    text = " ".join(message.lower().split())
    if len(text) > 100:
        return False
    if any(h in text for h in _ADVISORY_HINTS):
        return False
    return any(text.startswith(p) for p in _DEFINITIONAL_PREFIXES)


def _normalize_chat_payload(payload: dict, *, message: str = "") -> dict:
    """Keep only useful fields; blank unused template sections."""
    if not isinstance(payload, dict):
        return {
            "overview": str(payload)[:2000],
            "diagnosis": "",
            "recommendations": [],
            "prevention": "",
            "weather_note": "",
            "local_tip": "",
        }

    overview = str(payload.get("overview") or payload.get("answer") or "").strip()
    diagnosis = str(payload.get("diagnosis") or "").strip()
    prevention = str(payload.get("prevention") or "").strip()
    weather_note = str(payload.get("weather_note") or "").strip()
    local_tip = str(payload.get("local_tip") or "").strip()

    raw_recs = payload.get("recommendations") or []
    if isinstance(raw_recs, str):
        recommendations = [raw_recs.strip()] if raw_recs.strip() else []
    elif isinstance(raw_recs, list):
        recommendations = [str(r).strip() for r in raw_recs if str(r).strip()]
    else:
        recommendations = []

    if not overview:
        # Prefer a single prose answer over empty overview + filled extras.
        parts = [p for p in (diagnosis, prevention, weather_note, local_tip) if p]
        if recommendations:
            parts.extend(recommendations)
        overview = " ".join(parts)[:2000] if parts else "Please rephrase your question."

    # Definitional questions: keep the main answer; drop padded template sections.
    if message and _is_definitional_question(message):
        diagnosis = ""
        recommendations = []
        prevention = ""
        weather_note = ""
        local_tip = ""

    return {
        "overview": overview[:2000],
        "diagnosis": diagnosis[:1500],
        "recommendations": recommendations[:12],
        "prevention": prevention[:1500],
        "weather_note": weather_note[:800],
        "local_tip": local_tip[:500],
    }


def _farmer_context(user) -> tuple[str, str, str, dict | None]:
    """Return (display_name, county, country, weather_dict_or_None)."""
    name = (getattr(user, "first_name", "") or "").strip() or user.username
    county = ""
    country = "Kenya"
    try:
        farmer = user.farmer_profile
        county = (farmer.county or "").strip()
        country = (farmer.country or "Kenya").strip() or "Kenya"
    except Exception:
        pass

    weather = None
    if county:
        try:
            from main_app.utils_weather import get_weather_data

            query = f"{county},{country}"
            raw = get_weather_data(query)
            data = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(data, dict) and not data.get("error"):
                weather = data
            else:
                raw2 = get_weather_data(county)
                data2 = json.loads(raw2) if isinstance(raw2, str) else raw2
                if isinstance(data2, dict) and not data2.get("error"):
                    weather = data2
        except Exception as exc:  # noqa: BLE001
            logger.warning("AgriBot weather fetch failed: %s", exc)

    return name, county, country, weather


class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated, IsFarmer]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        message = strip_tags(str(request.data.get("message", ""))).strip()
        if not message:
            return Response(
                {"detail": "Please enter a message."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet = request.user.wallet
        is_free = wallet.chat_count < 5
        if not is_free and wallet.balance < 10:
            return Response(
                {
                    "detail": "Insufficient balance (KSh 10 required).",
                    "needs_topup": True,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        name, county, country, weather = _farmer_context(request.user)
        location_label = f"{county}, {country}" if county else country

        context_text = ""
        try:
            from rag.retrieve import retrieve_context

            context_text, _ = retrieve_context(message)
            if len(context_text) > 4500:
                context_text = context_text[:4500] + "\n…[truncated]"
        except Exception:
            context_text = ""

        weather_block = (
            json.dumps(weather, ensure_ascii=False)
            if weather
            else "Weather data unavailable."
        )
        rag_block = context_text or "No knowledge-base snippets retrieved."

        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_groq import ChatGroq

        system_prompt = f"""You are AgriBot, a warm expert agricultural advisor for East African farmers.
Respond in the same language as the user (English or Kiswahili).

CORE RULE — answer only what was asked:
- Read the farmer's question carefully. Give a direct, proportionate reply.
- Do NOT force a fixed template (diagnosis / steps / prevention / weather / tip) onto every message.
- Simple or definitional questions (e.g. "what is agriculture?") get a short clear answer in overview only; leave other fields empty ("" or []).
- Diagnostic / pest / disease questions: fill diagnosis and recommendations as needed; prevention only if useful.
- How-to / planning questions: use overview plus recommendations; skip diagnosis unless symptoms were described.
- Weather: fill weather_note ONLY if the question is about weather OR weather clearly changes the advice. Otherwise leave "".
- local_tip: optional one-line tip ONLY when it adds value for this specific question; otherwise "".
- Do NOT invent problems, crop plans, or irrigation advice the farmer did not ask about.

Tone: friendly and practical. You may briefly use the farmer's name ({name}) or location ({location_label}) when it helps, but do NOT open every reply with a thank-you script.

Ground advice in RAG CONTEXT and WEATHER DATA. Do NOT invent chemical rates, brands, or facts missing from the context. If context is thin, say so and give cautious general practice.

Return ONLY valid JSON with keys:
overview (string — the main answer to the question; required),
diagnosis (string — empty unless diagnosing a plant/pest/disease problem),
recommendations (array of strings — empty unless actionable steps are warranted),
prevention (string — empty unless prevention is relevant to the question),
weather_note (string — empty unless weather is relevant),
local_tip (string — empty unless a genuine local tip helps this answer).

FARMER: name={name}; location={location_label}
WEATHER DATA: {weather_block}
RAG CONTEXT:
{rag_block}
"""
        llm = ChatGroq(
            model=os.getenv("GROQ_CHAT_MODEL", os.getenv("GROQ_SCAN_MODEL", "openai/gpt-oss-120b")),
            groq_api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3,
        )
        try:
            result = llm.invoke(
                [SystemMessage(content=system_prompt), HumanMessage(content=message)]
            )
            content = result.content if hasattr(result, "content") else str(result)
            text = content.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            payload = _normalize_chat_payload(json.loads(text), message=message)
        except Exception as exc:  # noqa: BLE001
            raw = ""
            try:
                raw = content  # type: ignore[name-defined]
            except Exception:
                raw = ""
            fallback_text = (
                raw.strip()
                if isinstance(raw, str) and raw.strip()
                else "I could not format a reply just now. Please ask again in a moment."
            )
            payload = _normalize_chat_payload(
                {"overview": fallback_text}, message=message
            )
            logger.warning("AgriBot JSON parse failed: %s", exc)

        if not is_free:
            wallet.balance -= 10
        wallet.chat_count += 1
        wallet.save()

        return Response(
            {
                "response": payload,
                "wallet_balance": str(wallet.balance),
                "chat_count": wallet.chat_count,
                "farmer": {"name": name, "location": location_label},
            }
        )
