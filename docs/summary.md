# AgriScan — Executive Summary

**AgriScan** is an AI-powered agricultural platform built for East Africa—especially Kenya—that helps smallholder and semi-commercial farmers diagnose crop diseases from a phone photo, get practical advice in English or Kiswahili, connect with buyers and input suppliers, and build a verifiable digital farm profile that can unlock financial services.

**Primary contact:** Job Nyaribari — +254 758 503819 — [jobnyaribari808@gmail.com](mailto:jobnyaribari808@gmail.com)

---

## 1. Problem Statement

Agriculture employs most of the rural workforce in East Africa, yet yields stay low and supply chains remain fragmented. Three structural gaps drive crop loss, poverty, and food insecurity:

| Gap | What farmers face today |
|-----|-------------------------|
| **Accessibility** | Expert agronomists and extension officers cannot be everywhere. Diseases often spread beyond control before anyone diagnoses them. |
| **Market disconnect** | Even when farmers know what their crop needs—or have a good harvest—they lack a direct, transparent way to find buyers or trusted agrovets for the right inputs. |
| **Technology** | Precision agriculture tools exist but are priced for large commercial farms. Generic AI tools rarely offer localized treatment advice or tie into local supply chains and mobile money. |

**Consequences:** delayed treatment, pesticide misuse, reduced yields, post-harvest losses, and limited access to credit because banks lack verifiable farm-level data for smallholders.

---

## 2. Solution

AgriScan puts an **AI agronomist, advisor, and market connector** in every farmer's pocket through a mobile-first web platform (with native mobile packaging via CapacitorJS).

The platform delivers four integrated capabilities:

1. **AI crop diagnosis** — Farmers photograph affected leaves; computer vision models classify health and disease for 11+ crops with a gatekeeper filter that rejects non-plant images.
2. **AgriBot assistant** — A multilingual (English/Kiswahili) LLM chatbot with RAG over agricultural knowledge and optional real-time weather context.
3. **Role-based marketplace** — Separate portals for **farmers**, **buyers**, and **agencies** (fertiliser, seed, pesticide suppliers) to list produce and products.
4. **Farm Health Score & lending API** — A dynamic creditworthiness score (300–850) derived from scan activity, crop health ratios, and completed market connections, exposed to partner banks via a consent-based REST API.

AgriScan is designed to **support** good judgement—not replace extension officers, veterinarians, or emergency pest response.

---

## 3. How the System Works

### 3.1 High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Users (Browser / Mobile)                     │
│         Farmers  •  Buyers  •  Agencies  •  Site Admin          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              AgriScan Django Application (Gunicorn)              │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ Web UI & │ │ TensorFlow│ │ LangChain │ │ M-Pesa / Wallet  │  │
│  │ Dashboards│ │ Inference │ │ RAG Chat  │ │ Monetization     │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
  PostgreSQL    CropModels/     Groq LLM +      Safaricom
  (production)  .h5 files       ChromaDB        M-Pesa STK
                Cloudinary      HuggingFace     SendGrid / OAuth
```

### 3.2 User roles and journeys

| Role | Primary actions |
|------|-----------------|
| **Farmer** | Register → scan crops → chat with AgriBot → view Farm Health Score → list produce → opt in to lending data sharing → top up wallet via M-Pesa |
| **Buyer** | Register → browse farmer listings → initiate market connections |
| **Agency** | Register → manage product catalog (fertilisers, seeds, pesticides) → reach farmers post-diagnosis |
| **Partner (bank/fintech)** | Authenticate with API key → query Farm Health Score for consenting farmers by phone number |
| **Admin** | Monitor revenue, transactions, and platform metrics |

### 3.3 AI crop scan pipeline

Every scan follows a strict, auditable pipeline:

1. **Upload** — Farmer selects crop type and submits a leaf image (JPEG/PNG/WEBP, max 5 MB).
2. **Gatekeeper** — An EfficientNetB0 ImageNet model checks that the image is plant-related; obvious non-plants are rejected before classification.
3. **Wallet check** — First 2 scans are free for farmers; subsequent scans require KSh 20 wallet balance.
4. **Classification** — A crop-specific MobileNetV2 model (fine-tuned `.h5` weights) predicts disease class and confidence.
5. **Logging** — Results are stored in `CropScanLog` for scoring and analytics.
6. **Billing** — Wallet is debited KSh 20 (unless free trial).

**Supported crops (11 models deployed):** maize, potato, tomato, beans, wheat, cabbage, cauliflower, capsicum, cucumber, pea, onion.

**Model performance (training benchmarks):** ~97.2% training accuracy, ~85.6% validation accuracy, ~240 ms average inference time.

### 3.4 AgriBot (RAG assistant)

1. User sends a message via the `/chat/` JSON endpoint.
2. System retrieves relevant context from ChromaDB (embeddings via `all-MiniLM-L6-v2`).
3. Groq LLM (Llama family) generates a response with East Africa–focused system prompts.
4. Responses support **English and Kiswahili** based on user language.
5. First 5 chats are free; subsequent chats cost KSh 10 from the wallet.
6. Rate limiting (`django-ratelimit`) protects against abuse.

### 3.5 Farm Health Score

The score is recalculated when a farmer visits their profile. Algorithm (`utils_scoring.py`):

| Component | Points | Logic |
|-----------|--------|-------|
| **Base** | 300 | Starting score |
| **Engagement** | up to +200 | +10 per scan in last 180 days (max 200) |
| **Crop health** | up to +200 | Proportion of recent scans classified as healthy × 200 |
| **Market activity** | up to +150 | +50 per completed `MarketConnection` (max 150) |

**Risk tiers:** ≥700 Low Risk · ≥500 Medium Risk · below 500 High Risk

**Partner API:** `GET /api/v1/lending/score/?phone=<number>` with `Authorization: Bearer <api_key>`. Returns score, risk tier, scan count, and connections only if the farmer has explicitly opted in.

### 3.6 Payments (M-Pesa)

1. User initiates top-up from the wallet modal (amount + phone).
2. Safaricom STK Push is sent via the Daraja API.
3. Callback at `/mpesa/callback/` atomically updates `MpesaTransaction` and credits the user's `Wallet`.
4. All successful transactions feed the admin revenue dashboard.

### 3.7 Security and access control

- Django authentication with django-allauth (including Google OAuth).
- Role-based routing: farmers go to scan/profile; buyers and agencies to dashboards.
- CSRF protection on web forms; bearer-token auth on partner API.
- Session lifetime 30 minutes; HTTPS-enforced cookies in production.
- Farmer consent required before any lending data is shared.

---

## 4. Revenue Streams

AgriScan uses a **freemium + micro-transaction + B2B API** model suited to mobile-money economies.

### 4.1 Active revenue streams (implemented)

| Stream | Price | Mechanism | Target user |
|--------|-------|-----------|-------------|
| **AI crop scans** | **KSh 20 / scan** | Wallet debit after 2 free trial scans per farmer | Farmers |
| **AgriBot chat** | **KSh 10 / question** | Wallet debit after 5 free trial chats | All authenticated users |
| **M-Pesa wallet top-ups** | Variable (min KSh 10) | STK Push → wallet credit → consumed by scans and chat | Farmers, buyers |

Revenue is tracked in the admin dashboard (`/admin/revenue/`) via successful `MpesaTransaction` records.

### 4.2 B2B / partnership revenue (implemented infrastructure)

| Stream | Model | Value to partner |
|--------|-------|------------------|
| **Farm Health Score API** | API key licensing / per-query or subscription fees (commercial terms with banks, MFIs, SACCOs) | Real-time, consent-based farmer risk data for micro-lending and input credit without traditional collateral |

Partners authenticate with `PartnerAPIKey` tokens. Farmers must opt in via profile settings before any data is released.

### 4.3 Near-term and planned revenue streams

| Stream | Indicative pricing | Status |
|--------|-------------------|--------|
| **Agency storefront subscriptions** | Basic KSh 1,500/mo · Premium KSh 3,500/mo | UI and product design in place; subscription backend being finalized |
| **Marketplace transaction fees** | Commission on farmer–buyer connections | Marketplace infrastructure (`MarketConnection`) exists; fee layer planned |
| **Cooperative / drone scanning** | Per-hectare or subscription for multispectral field analysis | Roadmap Phase 3 (DJI Mavic 3M drones for large-scale NDVI mapping) |

### 4.4 Revenue model summary

```
                    ┌─────────────────────────────────────┐
                    │         AgriScan Revenue            │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │  B2C Micro-  │          │  B2B Partner │          │  B2B Agency  │
   │  transactions│          │  Lending API │          │  & Marketplace│
   │              │          │              │          │              │
   │ KSh 20/scan  │          │ API licensing│          │ Subscriptions│
   │ KSh 10/chat  │          │ per bank/MFI │          │ Listing fees │
   │ M-Pesa top-up│          │              │          │ (planned)    │
   └──────────────┘          └──────────────┘          └──────────────┘
          │                           │                           │
          └───────────────────────────┴───────────────────────────┘
                                      │
                              Farmers as the
                              growth engine →
                              data → lending →
                              marketplace flywheel
```

**Unit economics logic:** Low per-use prices (KSh 10–20) match farmer cash flow while M-Pesa removes friction. Free trials (2 scans, 5 chats) drive adoption. Repeated use builds Farm Health Score data, which unlocks B2B lending revenue—a higher-margin stream that scales with partner contracts rather than per-farmer spend alone.

---

## 5. Impact of the System

### 5.1 Direct impact on farmers

| Area | Expected outcome |
|------|------------------|
| **Faster diagnosis** | Diseases identified in minutes from a phone photo instead of waiting for extension visits |
| **Better input decisions** | Targeted treatment recommendations reduce wasted spend on wrong pesticides |
| **Market access** | Direct farmer–buyer connections shorten supply chains and improve price transparency |
| **Financial inclusion** | Farm Health Score gives banks a verifiable, activity-based risk signal for farmers without land titles or credit history |
| **Language inclusion** | Kiswahili support lowers the barrier for farmers uncomfortable with English-only tools |

### 5.2 Impact on the agricultural ecosystem

| Stakeholder | Benefit |
|-------------|---------|
| **Agrovets & input suppliers** | Reach farmers at the moment of diagnosis with relevant products |
| **Buyers** | Discover produce directly from source with farmer profiles and county data |
| **Extension services & policymakers** | Aggregated scan patterns (with privacy controls) can inform regional disease surveillance and training |
| **Financial institutions** | Lower cost of farmer onboarding and risk assessment via consent-based API |

### 5.3 Measurable KPIs (from project plan)

| KPI | 12–18 month target |
|-----|-------------------|
| Active farmers onboarded | 10,000 |
| AI-assisted crop scans | 50,000 |
| Registered agrovets | 500 |
| Verified buyers | 1,000 |
| Counties deployed (Kenya) | 5 |
| Diagnostic accuracy validation | Continuous benchmarking against partner agronomists |
| Economic impact | Bi-annual SMS surveys on yield improvement and reduced pesticide misuse |

### 5.4 Broader societal impact

- **Food security** — Earlier intervention reduces crop loss at scale across smallholder communities.
- **Rural employment** — Healthier harvests and market connections support farm income and downstream agribusiness jobs.
- **Climate resilience** — Data-driven input use and health monitoring support more sustainable farming practices.
- **Digital inclusion** — Mobile-money-native design meets farmers where they already transact.

---

## 6. Technology Stack (at a glance)

| Layer | Technology |
|-------|------------|
| Backend | Django 5.x, Gunicorn, PostgreSQL |
| AI / ML | TensorFlow 2.x, MobileNetV2, EfficientNetB0 gatekeeper |
| LLM / RAG | Groq (Llama-3.3-70b), LangChain, ChromaDB, HuggingFace embeddings |
| Payments | Safaricom M-Pesa Daraja API (STK Push) |
| Storage | Cloudinary (production media), WhiteNoise (static) |
| Auth | Django auth, django-allauth, Google OAuth, SendGrid email |
| Deployment | Docker, Railway |
| Mobile | CapacitorJS (native camera, app store packaging) |

---

## 7. Roadmap phases

| Phase | Focus | Key deliverables |
|-------|-------|------------------|
| **Phase 1: Polish & Pilot** | Stability and payments | M-Pesa integration, mobile UX, beta with ~500 farmers |
| **Phase 2: Growth & Marketplace** | User acquisition and revenue | Cooperative marketing, agrovet/buyer onboarding, micro-transaction revenue |
| **Phase 3: Drone Scaling** | Large-field intelligence | Multispectral drone scanning for cooperatives, NDVI mapping integration |

---

## 8. What AgriScan is not

- Not a substitute for national extension policy or declared pest emergencies.
- Not a guarantee of loans or market prices—lending requires farmer consent and partner approval.
- Not expert-only—designed for smartphone users regardless of formal education level.

---

## Further reading

| Document | Contents |
|----------|----------|
| [README.md](../README.md) | Installation, features, and quick start |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Full technical specs, API contracts, operations |
| [AgriScan_Stakeholder_Overview.md](./AgriScan_Stakeholder_Overview.md) | Non-technical overview for farmers and partners |
| [proposal.md](./proposal.md) | Grant proposal, budget, and SMART objectives |
| [AgriScan Technical Architecture Schematics.md](./AgriScan%20Technical%20Architecture%20Schematics.md) | Architecture diagrams |

---

*AgriScan — bridging practical AI, local languages, and agricultural markets for smallholders and semi-commercial growers in East Africa.*

**Job Nyaribari** — Founder & AI Lead  
**Phone:** +254 758 503819  
**Email:** [jobnyaribari808@gmail.com](mailto:jobnyaribari808@gmail.com)
