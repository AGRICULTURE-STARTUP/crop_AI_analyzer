# Ukulima Bora — Executive Summary

**Ukulima Bora** is a universal digital agricultural platform built for East Africa, beginning in Kenya. It helps farmers select suitable crops, monitor soil conditions through IoT sensors, diagnose crop problems from phone photographs, receive contextual English/Kiswahili advice, connect with buyers and suppliers, and build a consent-based digital farm record.

The core platform is deployed on a Contabo VPS at **[ukulimabora.co.ke](https://ukulimabora.co.ke)**. Crop-recommendation integration, production M-Pesa, SMS/USSD, SEO, and the IoT field layer are the current priorities.

**Primary contact:** Job Nyaribari — +254 758 503819 — [jobnyaribari808@gmail.com](mailto:jobnyaribari808@gmail.com)

---

## 1. Problem Statement

Agriculture employs much of East Africa's rural workforce, yet many farmers make critical decisions without timely soil measurements, crop-health information, or expert support. Five structural gaps drive avoidable crop loss and weak financial resilience:

| Gap | What farmers face today |
|-----|-------------------------|
| **Accessibility** | Expert agronomists and extension officers cannot be everywhere. Diseases often spread beyond control before anyone diagnoses them. |
| **Crop-selection gap** | Farmers may choose crops without converting NPK, pH, rainfall, temperature, and humidity data into a practical recommendation. |
| **Field-data gap** | Most small farms lack affordable, continuous measurements of soil nutrients and moisture. |
| **Market disconnect** | Even when farmers know what their crop needs—or have a good harvest—they lack a direct, transparent way to find buyers or trusted agrovets for the right inputs. |
| **Technology** | Precision agriculture tools exist but are priced for large commercial farms. Generic AI tools rarely offer localized treatment advice or tie into local supply chains and mobile money. |

**Consequences:** delayed treatment, pesticide misuse, reduced yields, post-harvest losses, and limited access to credit because banks lack verifiable farm-level data for smallholders.

---

## 2. Solution

Ukulima Bora provides an **AI-assisted agronomist, field monitor, and market connector** through a mobile-first web platform. It supports farmer decisions but does not replace qualified agronomists or extension officers.

The platform combines six capabilities:

1. **Crop recommendation (integration in progress)** — Stephen Kingori's Gaussian Naive Bayes system recommends among 22 crops from N, P, K, pH, temperature, humidity, and rainfall.
2. **IoT field monitoring (planned prototype)** — NPK and soil-moisture sensors will provide measured field context, with additional pH and environmental sensors added after validation.
3. **AI crop diagnosis** — Farmers photograph affected leaves; crop-specific computer-vision models classify health and disease, with a gatekeeper that rejects obvious non-plant images.
4. **AgriBot assistant** — A multilingual LLM and RAG assistant combines trusted content with crop, scan, weather, sensor, and farm-history context.
5. **Role-based marketplace and payments** — Farmer, buyer, and agency portals link diagnosis and production to products, markets, and M-Pesa.
6. **Farm Health Score and lending API** — A consent-based score derived from platform activity provides a potential signal for approved financial partners.

Ukulima Bora is designed to **support** good judgement—not replace extension officers, veterinarians, or emergency pest response.

---

## 3. How the System Works

### 3.1 High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Users (Browser / Mobile)                     │
│ Farmers • Buyers • Agencies • Admin • Sensors/Field Gateways    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Ukulima Bora Django Application (Gunicorn)              │
│ Web UI • TensorFlow diagnosis • Crop recommendation • AgriBot  │
│ Marketplace • Wallet/M-Pesa • Farm profiles • Telemetry API    │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
 PostgreSQL   Crop models   Groq/ChromaDB   M-Pesa   IoT devices
```

### 3.2 User roles and journeys

| Role | Primary actions |
|------|-----------------|
| **Farmer** | Register → scan crops → chat with AgriBot → view Farm Health Score → list produce → opt in to lending data sharing → top up wallet via M-Pesa |
| **Buyer** | Register → browse farmer listings → initiate market connections |
| **Agency** | Register → manage product catalog (fertilisers, seeds, pesticides) → reach farmers post-diagnosis |
| **Partner (bank/fintech)** | Authenticate with API key → query Farm Health Score for consenting farmers by phone number |
| **Admin** | Monitor revenue, transactions, and platform metrics |

The target farmer journey is: **register farm → capture or receive soil readings → receive crop recommendation → monitor field → diagnose symptoms → receive advice → obtain inputs or find buyers → retain an auditable season history**.

### 3.3 Crop recommendation pipeline (integration target)

1. Farmer enters soil/climate values or selects validated sensor and weather readings.
2. The API validates units, ranges, freshness, and missing values.
3. The saved scaler transforms seven ordered features.
4. The Gaussian Naive Bayes model returns a crop recommendation from 22 classes.
5. Ukulima Bora displays the result, confidence/limitations, and an explanation of the input values.
6. The request and model version are logged for field evaluation.

The existing recommender is a standalone Flask application. It must be migrated behind an authenticated Django service/API, tested against the exact saved model/scaler, and validated locally before being treated as agronomic evidence.

### 3.4 IoT-to-advice pipeline (planned)

1. Registered field devices capture NPK and soil-moisture readings.
2. A gateway sends timestamped, authenticated telemetry to Ukulima Bora.
3. The platform validates units and plausible ranges and stores accepted and rejected readings.
4. Recent trusted readings become context for crop recommendation, diagnosis, irrigation/fertiliser guidance, and alerts.
5. Farmers and agronomists can inspect readings and override faulty data.

### 3.5 AI crop scan pipeline

Every scan follows a strict, auditable pipeline:

1. **Upload** — Farmer selects crop type and submits a leaf image (JPEG/PNG/WEBP, max 5 MB).
2. **Gatekeeper** — An EfficientNetB0 ImageNet model checks that the image is plant-related; obvious non-plants are rejected before classification.
3. **Wallet check** — First 2 scans are free for farmers; subsequent scans require KSh 20 wallet balance.
4. **Classification** — A crop-specific MobileNetV2 model (fine-tuned `.h5` weights) predicts disease class and confidence.
5. **Logging** — Results are stored in `CropScanLog` for scoring and analytics.
6. **Billing** — Wallet is debited KSh 20 (unless free trial).

**Supported crops (11 models deployed):** maize, potato, tomato, beans, wheat, cabbage, cauliflower, capsicum, cucumber, pea, onion.

**Model performance (training benchmarks):** ~97.2% training accuracy, ~85.6% validation accuracy, ~240 ms average inference time.

### 3.6 AgriBot (RAG assistant)

1. User sends a message via the `/chat/` JSON endpoint.
2. System retrieves relevant context from ChromaDB (embeddings via `all-MiniLM-L6-v2`).
3. Groq LLM (Llama family) generates a response with East Africa–focused system prompts.
4. Responses support **English and Kiswahili** based on user language.
5. First 5 chats are free; subsequent chats cost KSh 10 from the wallet.
6. Rate limiting (`django-ratelimit`) protects against abuse.

### 3.7 Farm Health Score

The score is recalculated when a farmer visits their profile. Algorithm (`utils_scoring.py`):

| Component | Points | Logic |
|-----------|--------|-------|
| **Base** | 300 | Starting score |
| **Engagement** | up to +200 | +10 per scan in last 180 days (max 200) |
| **Crop health** | up to +200 | Proportion of recent scans classified as healthy × 200 |
| **Market activity** | up to +150 | +50 per completed `MarketConnection` (max 150) |

**Risk tiers:** ≥700 Low Risk · ≥500 Medium Risk · below 500 High Risk

**Partner API:** `GET /api/v1/lending/score/?phone=<number>` with `Authorization: Bearer <api_key>`. Returns score, risk tier, scan count, and connections only if the farmer has explicitly opted in.

### 3.8 Payments (M-Pesa)

1. User initiates top-up from the wallet modal (amount + phone).
2. Safaricom STK Push is sent via the Daraja API.
3. Callback at `/mpesa/callback/` atomically updates `MpesaTransaction` and credits the user's `Wallet`.
4. All successful transactions feed the admin revenue dashboard.

### 3.9 Security and access control

- Django authentication with django-allauth (including Google OAuth).
- Role-based routing: farmers go to scan/profile; buyers and agencies to dashboards.
- CSRF protection on web forms; bearer-token auth on partner API.
- Session lifetime 30 minutes; HTTPS-enforced cookies in production.
- Farmer consent required before any lending data is shared.
- IoT devices require unique credentials; readings must include farm/device identity, timestamp, unit, and validation status.
- Sensor data and AI outputs are advisory and must preserve provenance for audit and correction.

---

## 4. Revenue Streams

Ukulima Bora uses a **freemium + micro-transaction + B2B API** model suited to mobile-money economies.

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
                    │         Ukulima Bora Revenue            │
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
| Deployment | Docker, Gunicorn, Nginx, PostgreSQL on Contabo VPS; `ukulimabora.co.ke` |
| Mobile | CapacitorJS (native camera, app store packaging) |
| Crop recommendation | scikit-learn GaussianNB + MinMaxScaler; standalone Flask source being integrated |
| IoT (planned) | NPK and moisture sensors, controller/gateway, authenticated telemetry API |

---

## 7. Roadmap phases

| Phase | Focus | Key deliverables |
|-------|-------|------------------|
| **Phase 1: Integration** | Complete the connected core | Crop recommender, M-Pesa production, SMS/USSD, SEO, tests and security |
| **Phase 2: IoT prototype** | Measured field intelligence | Sensor procurement, calibration, telemetry API, dashboards and alerts |
| **Phase 3: Field validation** | Agronomic evidence | Monitored plots, agronomist comparison, farmer feedback and model improvement |
| **Phase 4: Scale** | Markets and partnerships | Cooperative, agrovet, buyer and finance services based on validated outcomes |

---

## 8. What Ukulima Bora is not

- Not a substitute for national extension policy or declared pest emergencies.
- Not a guarantee of loans or market prices—lending requires farmer consent and partner approval.
- Not a guarantee that a recommended crop will succeed; model outputs depend on input quality, local conditions, and field validation.
- Not a claim that low-cost NPK sensors are laboratory-equivalent; sensor readings require calibration and quality controls.
- Not expert-only—designed for smartphone users regardless of formal education level.

---

## Further reading

| Document | Contents |
|----------|----------|
| [README.md](../README.md) | Installation, features, and quick start |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Full technical specs, API contracts, operations |
| [Ukulima Bora_Stakeholder_Overview.md](./Ukulima Bora_Stakeholder_Overview.md) | Non-technical overview for farmers and partners |
| [proposal.md](./proposal.md) | Grant proposal, budget, and SMART objectives |
| [Ukulima Bora Technical Architecture Schematics.md](./Ukulima Bora%20Technical%20Architecture%20Schematics.md) | Architecture diagrams |

---

*Ukulima Bora — connecting soil, crops, advice, markets, and finance in one farmer-controlled system.*

**Job Nyaribari** — Founder & AI Lead  
**Phone:** +254 758 503819  
**Email:** [jobnyaribari808@gmail.com](mailto:jobnyaribari808@gmail.com)

**Core team:** Job Nyaribari, Ziro, Lynn, and Stephen Kingori.
