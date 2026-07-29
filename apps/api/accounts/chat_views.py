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
Personalize every reply: thank the farmer by first name ({name}) and mention their location ({location_label}) when giving advice — e.g. "Thank you so much {name} for this question. In {county or location_label}, maize plants often…".

Ground advice in RAG CONTEXT and WEATHER DATA. Do NOT invent chemical rates, brands, or facts missing from the context. If context is thin, say so and give cautious general practice.

Return ONLY valid JSON with keys:
overview (string — start with a personalized greeting/thanks using the farmer's name and location),
diagnosis (string),
recommendations (array of strings),
prevention (string),
weather_note (string — how current weather in their area affects the advice; empty if no weather),
local_tip (string — one tip for their county).

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
            payload = json.loads(text)
        except Exception as exc:  # noqa: BLE001
            raw = ""
            try:
                raw = content  # type: ignore[name-defined]
            except Exception:
                raw = "Unable to parse model output."
            payload = {
                "overview": (
                    f"Thank you so much {name} for this question. "
                    f"In {location_label}, here is what I can share right now: "
                    f"{raw if isinstance(raw, str) else 'please try again shortly.'}"
                ),
                "diagnosis": "",
                "recommendations": [],
                "prevention": "",
                "weather_note": "",
                "local_tip": str(exc)[:200],
            }

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
