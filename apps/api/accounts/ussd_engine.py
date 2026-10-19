"""
USSD menu engine for Ukulima Bora farmers.

Designed for Africa's Talking / Twilio / TextSMS style callbacks:
  session_id, phone_number, text (joined with *)

Scanning requires a camera — intentionally omitted from USSD.
When live gateway credentials arrive, point the provider webhook at
POST /api/v1/ussd/ — this engine stays the same.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.core.cache import cache
from django.db.models import Avg

from main_app.models import FarmerProfile, FarmHealthProfile, Wallet
from main_app.utils_scoring import calculate_farm_health_score

SESSION_TTL = 180  # seconds — typical USSD timeout
DEMO_PHONE = "254700000000"


@dataclass
class UssdReply:
    message: str
    end: bool = False

    def as_africastalking(self) -> str:
        prefix = "END " if self.end else "CON "
        return prefix + self.message

    def as_json(self) -> dict[str, Any]:
        return {
            "message": self.message,
            "end": self.end,
            "response": self.as_africastalking(),
        }


def _cache_key(session_id: str) -> str:
    return f"ussd:session:{session_id}"


def _normalize_phone(phone: str) -> str:
    digits = "".join(c for c in (phone or "") if c.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if digits.startswith("7") and len(digits) == 9:
        return "254" + digits
    return digits or DEMO_PHONE


def _phone_variants(phone: str) -> set[str]:
    n = _normalize_phone(phone)
    variants = {phone, n}
    if n.startswith("254") and len(n) == 12:
        variants.add("0" + n[3:])
        variants.add("+" + n)
    return {v for v in variants if v}


def resolve_farmer(phone: str) -> FarmerProfile | None:
    variants = _phone_variants(phone)
    return FarmerProfile.objects.filter(phone_number__in=variants).select_related(
        "user", "health_profile"
    ).first()


def _main_menu(farmer: FarmerProfile | None, demo: bool) -> str:
    who = (
        (farmer.user.first_name or farmer.user.username)
        if farmer
        else ("Demo farmer" if demo else "Farmer")
    )
    return (
        f"Ukulima Bora — Karibu {who}\n"
        "1. Wallet balance\n"
        "2. Ask AgriBot\n"
        "3. Market / produce\n"
        "4. Find inputs\n"
        "5. Farm Health Score\n"
        "6. Lending consent\n"
        "7. My profile\n"
        "8. Top-up help\n"
        "0. Exit\n"
        "(Scan needs the mobile app)"
    )


def _get_wallet(farmer: FarmerProfile | None) -> Wallet | None:
    if farmer is None:
        return None
    wallet, _ = Wallet.objects.get_or_create(user=farmer.user)
    return wallet


def handle_ussd(
    *,
    session_id: str,
    phone_number: str,
    text: str,
    service_code: str = "",
) -> UssdReply:
    """Process one USSD step. `text` is Africa's Talking style: '' then '1' then '1*2'."""
    phone = _normalize_phone(phone_number)
    farmer = resolve_farmer(phone)
    demo = farmer is None
    parts = [p for p in (text or "").strip().split("*") if p != ""]

    state = cache.get(_cache_key(session_id)) or {
        "phone": phone,
        "mode": "menu",
        "pending": None,
    }

    # Fresh dial
    if not parts:
        state["mode"] = "menu"
        state["pending"] = None
        cache.set(_cache_key(session_id), state, SESSION_TTL)
        return UssdReply(_main_menu(farmer, demo), end=False)

    choice = parts[0]

    if choice == "0":
        cache.delete(_cache_key(session_id))
        return UssdReply("Asante. Ukulima Bora — crop intelligence in your pocket.", end=True)

    # Nested AgriBot free-text: 2*<question>
    if choice == "2":
        if len(parts) == 1:
            state["mode"] = "agribot"
            cache.set(_cache_key(session_id), state, SESSION_TTL)
            return UssdReply(
                "Ask AgriBot (EN/SW).\nType your question then send.\n0. Back",
                end=False,
            )
        question = "*".join(parts[1:]).strip()
        if question == "0":
            cache.set(_cache_key(session_id), {"phone": phone, "mode": "menu"}, SESSION_TTL)
            return UssdReply(_main_menu(farmer, demo), end=False)
        return _agribot_reply(farmer, question, demo)

    if choice == "1":
        return _wallet_reply(farmer, demo)

    if choice == "3":
        return _market_reply(farmer, demo)

    if choice == "4":
        county = (farmer.county if farmer and farmer.county else None) or "Nairobi"
        if len(parts) == 1:
            return UssdReply(
                f"Find inputs near {county}\n"
                "1. Fertiliser\n"
                "2. Seeds\n"
                "3. Pesticides\n"
                "0. Back",
                end=False,
            )
        sub = parts[1]
        if sub == "0":
            return UssdReply(_main_menu(farmer, demo), end=False)
        kind = {"1": "fertiliser", "2": "seeds", "3": "pesticides"}.get(sub)
        if not kind:
            return UssdReply("Invalid option.\n0. Back", end=False)
        return _inputs_reply(county, kind)

    if choice == "5":
        return _score_reply(farmer, demo)

    if choice == "6":
        if len(parts) == 1:
            opted = False
            if farmer:
                try:
                    opted = farmer.health_profile.opt_in_for_lending
                except FarmHealthProfile.DoesNotExist:
                    opted = False
            status = "ON" if opted else "OFF"
            return UssdReply(
                f"Lending consent is {status}.\n"
                "Share Farm Health Score with approved lenders?\n"
                "1. Turn ON\n"
                "2. Turn OFF\n"
                "0. Back",
                end=False,
            )
        sub = parts[1]
        if sub == "0":
            return UssdReply(_main_menu(farmer, demo), end=False)
        if demo or farmer is None:
            return UssdReply(
                "Demo mode: register as a farmer in the app to save consent.\n"
                f"Dial again or open the app.\n"
                f"Service: {service_code or '*384*55#'}",
                end=True,
            )
        if sub == "1":
            hp, _ = FarmHealthProfile.objects.get_or_create(farmer=farmer)
            hp.opt_in_for_lending = True
            hp.save(update_fields=["opt_in_for_lending"])
            return UssdReply("Consent ON. Lenders may request your score.", end=True)
        if sub == "2":
            hp, _ = FarmHealthProfile.objects.get_or_create(farmer=farmer)
            hp.opt_in_for_lending = False
            hp.save(update_fields=["opt_in_for_lending"])
            return UssdReply("Consent OFF. Score will not be shared.", end=True)
        return UssdReply("Invalid option.", end=True)

    if choice == "7":
        return _profile_reply(farmer, demo, phone)

    if choice == "8":
        return UssdReply(
            "Top up via M-Pesa in the Ukulima Bora app:\n"
            "Profile → Wallet → Top up.\n"
            "Or STK push after you register.\n"
            "Scanning & chat use wallet credits.",
            end=True,
        )

    return UssdReply("Invalid option.\n" + _main_menu(farmer, demo), end=False)


def _wallet_reply(farmer: FarmerProfile | None, demo: bool) -> UssdReply:
    if demo or farmer is None:
        return UssdReply(
            "DEMO wallet\n"
            "Balance: KSh 150.00\n"
            "Free scans left: 2\n"
            "Free chats left: 3\n"
            "Register in app to link this phone.",
            end=True,
        )
    wallet = _get_wallet(farmer)
    assert wallet is not None
    free_scans = max(0, 10 - wallet.scan_count)
    free_chats = max(0, 10 - wallet.chat_count)
    return UssdReply(
        f"Wallet\n"
        f"Balance: KSh {wallet.balance}\n"
        f"Free scans left: {free_scans}\n"
        f"Free chats left: {free_chats}",
        end=True,
    )


def _market_reply(farmer: FarmerProfile | None, demo: bool) -> UssdReply:
    if demo or farmer is None:
        return UssdReply(
            "DEMO market prices\n"
            "Check KAMIS crop prices in the app:\n"
            "Open /farmer/market for latest prices.",
            end=True,
        )
    products = (farmer.products or "Not listed").strip()
    return UssdReply(
        f"Your produce: {products[:80]}\n"
        f"County: {farmer.county or '—'}\n"
        "Open /farmer/market in the app for latest KAMIS prices.",
        end=True,
    )


def _inputs_reply(county: str, kind: str) -> UssdReply:
    """Return registered agencies / products for county from the DB."""
    from accounts.models import AgencyProduct, AgencyProfile

    category_map = {
        "fertiliser": "fertiliser",
        "seeds": "seed",
        "pesticides": "pesticide",
    }
    category = category_map.get(kind)

    products = (
        AgencyProduct.objects.filter(
            is_available=True,
            is_hidden=False,
            agency__county__icontains=county,
        )
        .select_related("agency")
        .order_by("-created_at")
    )
    if category:
        products = products.filter(category=category)
    products = list(products[:4])

    if products:
        lines = [
            f"{p.name} — {p.agency.agency_name}"
            + (f" ({p.agency.phone})" if p.agency.phone else "")
            for p in products
        ]
        body = "\n".join(f"• {line}" for line in lines)
        return UssdReply(
            f"{kind.title()} near {county}\n{body}\n"
            "More: /farmer/inputs in the app.",
            end=True,
        )

    agencies = list(
        AgencyProfile.objects.filter(county__icontains=county).order_by(
            "agency_name"
        )[:4]
    )
    if not agencies:
        return UssdReply(
            f"No registered input stores in {county} yet.\n"
            "Ask an agrovet to sign up on Ukulima Bora.",
            end=True,
        )
    lines = [
        f"{a.agency_name} — {a.agency_type}"
        + (f" · {a.phone}" if a.phone else "")
        for a in agencies
    ]
    body = "\n".join(f"• {line}" for line in lines)
    return UssdReply(
        f"Stores near {county}\n{body}\n"
        "Full catalogue: /farmer/inputs in the app.",
        end=True,
    )


def _score_reply(farmer: FarmerProfile | None, demo: bool) -> UssdReply:
    if demo or farmer is None:
        return UssdReply(
            "DEMO Farm Health Score\n"
            "Score: 620\n"
            "Tier: Medium Risk\n"
            "Consent: OFF\n"
            "Register + opt in to share with lenders.",
            end=True,
        )
    health = calculate_farm_health_score(farmer)
    consent = "ON" if health.opt_in_for_lending else "OFF"
    avg_conf = (
        farmer.scan_logs.aggregate(avg=Avg("confidence_score"))["avg"] or 0
    )
    return UssdReply(
        f"Farm Health Score\n"
        f"Score: {health.health_score}\n"
        f"Tier: {health.risk_tier}\n"
        f"Scans: {farmer.scan_logs.count()}\n"
        f"Avg confidence: {float(avg_conf):.0%}\n"
        f"Lending consent: {consent}",
        end=True,
    )


def _profile_reply(
    farmer: FarmerProfile | None, demo: bool, phone: str
) -> UssdReply:
    if demo or farmer is None:
        return UssdReply(
            f"Phone: {phone}\n"
            "Status: not registered\n"
            "Sign up at ukulimabora.co.ke/signup/farmer\n"
            "Use this phone number to link USSD.",
            end=True,
        )
    return UssdReply(
        f"{farmer.user.get_full_name() or farmer.user.username}\n"
        f"Phone: {farmer.phone_number}\n"
        f"County: {farmer.county or '—'}\n"
        f"Country: {farmer.country or '—'}",
        end=True,
    )


def _agribot_reply(
    farmer: FarmerProfile | None, question: str, demo: bool
) -> UssdReply:
    """Short SMS-sized AgriBot answer. Debits wallet when a real farmer is linked."""
    if not question:
        return UssdReply("Empty question. Try again.", end=True)

    wallet = _get_wallet(farmer) if farmer and not demo else None
    if wallet is not None:
        is_free = wallet.chat_count < 10
        if not is_free and wallet.balance < Decimal("10"):
            return UssdReply(
                "Insufficient balance (KSh 10).\nTop up in the Ukulima Bora app.",
                end=True,
            )

    overview = _short_advice(question)

    if wallet is not None:
        if wallet.chat_count < 10:
            wallet.chat_count += 1
        else:
            wallet.balance -= Decimal("10")
        wallet.save()

    # USSD screens are tiny — keep under ~300 chars.
    trimmed = overview[:280]
    return UssdReply(f"AgriBot:\n{trimmed}", end=True)


def _short_advice(question: str) -> str:
    q = question.lower()
    try:
        from rag.retrieve import retrieve_context

        context_text, _ = retrieve_context(question)
    except Exception:
        context_text = ""

    try:
        import json
        import os

        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            model="openai/gpt-oss-120b",
            groq_api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.2,
        )
        prompt = (
            "You are AgriBot for East African farmers on USSD (max 240 chars). "
            "Give one short practical tip in the user's language. No JSON.\n"
            f"CONTEXT:\n{(context_text or '')[:800]}\n"
        )
        result = llm.invoke(
            [SystemMessage(content=prompt), HumanMessage(content=question)]
        )
        content = result.content if hasattr(result, "content") else str(result)
        return str(content).strip()[:280]
    except Exception:
        pass

    # Offline / no-Groq fallback tips
    if any(w in q for w in ("blight", "fungus", "mould", "mold")):
        return (
            "Remove infected leaves, improve airflow, avoid overhead watering. "
            "Use a copper fungicide if spread continues. Ask in the app for crop-specific steps."
        )
    if any(w in q for w in ("drought", "dry", "maji", "irrigation")):
        return (
            "Mulch to keep moisture, water early morning, prioritise flowering crops. "
            "Consider drought-tolerant varieties next season."
        )
    if any(w in q for w in ("fertili", "mbolea", "npk")):
        return (
            "Soil-test if possible. For maize, basal DAP/NPK at planting then top-dress CAN. "
            "Do not burn seedlings with excess nitrogen."
        )
    return (
        "Rotate crops, scout weekly for pests, and keep records. "
        "Open AgriBot in the app for a full diagnosis. "
        f"(Q: {question[:60]})"
    )
