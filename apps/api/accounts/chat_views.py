"""Thin AgriBot JSON API for the Next.js SPA."""

from __future__ import annotations

import json
import logging
import os

from django.db import transaction
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsFarmer
from main_app.models import Wallet

logger = logging.getLogger(__name__)

CHAT_FEE = 10
FREE_CHATS = 5


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

        # Cheap read-only gate so obvious top-up cases fail fast. The authoritative
        # check happens under a row lock when the debit is written below.
        wallet = Wallet.objects.get(user=request.user)
        if wallet.chat_count >= FREE_CHATS and wallet.balance < CHAT_FEE:
            return Response(
                {
                    "detail": f"Insufficient balance (KSh {CHAT_FEE} required).",
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
        paid = False
        content = ""
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
            paid = True
        except Exception as exc:  # noqa: BLE001
            # The farmer gets nothing usable, so nothing is charged. Only a
            # successful model response counts against the free/paid quota.
            logger.warning("AgriBot chat failed for user %s: %s", request.user_id, exc)
            payload = {
                "overview": (
                    f"Thank you for your question, {name}. "
                    f"AgriBot could not answer just now — please try again in a moment. "
                    "You have not been charged for this message."
                ),
                "diagnosis": "",
                "recommendations": [],
                "prevention": "",
                "weather_note": "",
                "local_tip": "",
            }

        with transaction.atomic():
            locked = Wallet.objects.select_for_update().get(user=request.user)
            charged = False
            if paid:
                if locked.chat_count >= FREE_CHATS:
                    if locked.balance < CHAT_FEE:
                        return Response(
                            {
                                "detail": f"Insufficient balance (KSh {CHAT_FEE} required).",
                                "needs_topup": True,
                            },
                            status=status.HTTP_402_PAYMENT_REQUIRED,
                        )
                    locked.balance -= CHAT_FEE
                    charged = True
                locked.chat_count += 1
                locked.save(update_fields=["balance", "chat_count", "last_updated"])
            response_balance = str(locked.balance)
            response_chat_count = locked.chat_count

        return Response(
            {
                "response": payload,
                "wallet_balance": response_balance,
                "chat_count": response_chat_count,
                "charged": charged,
                "farmer": {"name": name, "location": location_label},
            }
        )
