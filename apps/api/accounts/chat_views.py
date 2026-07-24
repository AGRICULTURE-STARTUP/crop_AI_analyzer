"""Thin AgriBot JSON API for the Next.js SPA."""

from __future__ import annotations

import json
import os

from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

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

        context_text = ""
        try:
            from rag.retrieve import retrieve_context

            context_text, _ = retrieve_context(message)
        except Exception:
            context_text = ""

        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_groq import ChatGroq

        system_prompt = f"""You are AgriBot, an expert agricultural advisor for East Africa.
Respond in the same language as the user (English or Kiswahili).
Return ONLY valid JSON with keys:
overview, diagnosis, recommendations (array of strings), prevention, local_tip.
CONTEXT:
{context_text}
"""
        llm = ChatGroq(
            model="openai/gpt-oss-120b",
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
                "overview": raw if isinstance(raw, str) else "Unable to parse model output.",
                "diagnosis": "",
                "recommendations": [],
                "prevention": "",
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
            }
        )
