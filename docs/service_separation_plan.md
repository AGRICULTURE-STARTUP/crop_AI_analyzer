# AgriScan Service Separation Plan

**Next.js frontend (Vercel) · Django API + all backend services in Docker (Contabo VPS)**

**Document version:** 1.3  
**Date:** 24 July 2026  
**Status:** Implementation blueprint  
**Selected Contabo VPS (start):** 4 vCPU · **8 GB RAM** · 100 GB SSD · 200 Mbit/s · 1 snapshot  

---

## 1. Purpose

Rewrite AgriScan from a **monolithic Django app** (templates + views + ML + RAG in one process) into a **separated product**:

| Layer | Stack | Host | Runtime |
|-------|--------|------|---------|
| Frontend | Next.js (App Router) + TypeScript | **Vercel** | Vercel platform |
| Backend API | Django 5 + Django REST Framework (DRF) | **Contabo VPS** | **Docker container** |
| Primary DB | PostgreSQL 16 | Contabo VPS | **Docker container** |
| Cache / queue | Redis 7 | Contabo VPS | **Docker container** |
| Inference workers | Celery (scanner + RAG) | Contabo VPS | **Docker containers** |
| Reverse proxy | Nginx (+ Certbot companion) | Contabo VPS | **Docker containers** |
| Vector / RAG store | ChromaDB (disk volume) or pgvector | Contabo VPS | Volume / same Postgres container |
| Media | Cloudinary (existing) | Cloud | Managed SaaS |
| LLM generation | Groq API (existing) | Cloud | Managed SaaS |
| Crop vision models | TensorFlow `.h5` (lazy-loaded) | Contabo VPS | Mounted volume → scanner container |

**Deployment rule:** On Contabo, **every** long-running service (Postgres, Redis, API, Celery workers, Nginx, optional Chroma) runs as a **Docker Compose service**. No bare-metal systemd Postgres/Redis/Gunicorn in production. The VPS host only runs Docker Engine, UFW/Fail2ban, and disk backups of named volumes.

All current product features stay in place: **crop scanner**, **AgriBot**, **input / agrovet discovery (agent)**, **marketplace**, **Farm Health Score + partner API**, **M-Pesa wallet**, and **admin revenue**.

**New in this rewrite:** self-service **lending / loaning agency signup** so banks, MFIs, and SACCOs can authenticate, manage their Farm Health Score API keys, and call the score endpoint—without AgriScan staff manually inserting `PartnerAPIKey` rows.

---

## 2. Current System Snapshot (as-is)

Today everything lives in one Django process:

```
Browser → Django templates/static → views.py
                                      ├── TensorFlow crop models + EfficientNet gatekeeper
                                      ├── AgriBot (Groq + rag/retrieve)
                                      ├── LangGraph agrovet agent (Tavily)
                                      ├── M-Pesa STK + wallet gating
                                      └── Farm Health Score / partner API
```

### 2.1 Features to preserve

| Feature | Current entry points | Core modules |
|---------|----------------------|--------------|
| **Crop scanner** | `GET /page`, `POST /process` | `views.get_crop_model`, `get_gatekeeper`, `CropScanLog`, wallet debit KSh 20 |
| **AgriBot** | `POST /chat/` | `rag.retrieve`, Groq LLM, session chat history, wallet debit KSh 10 |
| **Input / agrovet agent** | Fertiliser flows + `agents.run_agrovet_agent` | LangGraph + Tavily + Groq extraction |
| **Marketplace** | `/market/`, `/farmers`, buyer dashboard | `FarmerProfile`, `BuyerProfile`, `MarketConnection` |
| **Farm Health Score** | Farmer profile + `GET /api/v1/lending/score/` | `utils_scoring`, `FarmHealthProfile`, `PartnerAPIKey` (admin-provisioned today) |
| **Lending / loan partner** | *(new — no self-service UI today)* | Signup + dashboard to create/rotate API keys and query consenting farmers |
| **Payments** | `/mpesa/topup/`, `/mpesa/callback/` | `mpesa_utils.MpesaGateway`, `Wallet`, `MpesaTransaction` |
| **Auth** | Login/signup/reset + Google OAuth (allauth) | Session auth today → JWT/cookie auth for SPA; add **lender** role |
| **Admin revenue** | `/admin/revenue/` | Aggregates on `MpesaTransaction` |

### 2.2 ML / RAG assets on the VPS today

- **11 crop `.h5` models** under `main_app/CropModels/` (also downloadable via `HF_MODEL_REPO_ID`)
- **Gatekeeper:** EfficientNetB0 ImageNet weights (loaded once, cached)
- **Embeddings:** `all-MiniLM-L6-v2`
- **Reranker:** `cross-encoder/ms-marco-MiniLM-L-6-v2`
- **ChromaDB** at `chroma_db/` + BM25 corpus
- **Generation:** remote Groq (does **not** use VPS GPU/CPU for LLM tokens)

### 2.3 Pain of the monolith

1. UI and inference share one Gunicorn process pool → a scan can starve chat/API.
2. Loading many `.h5` models into one process risks **RAM exhaustion** on a mid-size Contabo box.
3. Django templates + jQuery-style static JS are hard to evolve into a mobile-first product (Capacitor later).
4. CORS/auth were never designed for a separate Vercel origin.

---

## 3. Target Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Vercel (not Docker — platform-managed)                     │
│  Next.js App (SSR/ISR marketing + client dashboards)        │
│  agri-scan.vercel.app  →  api.agriscan.example.com          │
└─────────────────────────────┬──────────────────────────────┘
                              │ HTTPS + JWT / httpOnly cookies
                              │ multipart for scan images
┌─────────────────────────────▼──────────────────────────────┐
│  Contabo VPS — Docker Compose stack                         │
│                                                             │
│  ┌─────────────┐   docker network: agriscan_net             │
│  │ nginx       │◀── :80/:443 published only                 │
│  │ (+ certbot) │                                            │
│  └──────┬──────┘                                            │
│         │ proxy_pass http://api:8000                        │
│  ┌──────▼──────┐     ┌─────────────┐     ┌──────────────┐  │
│  │ api         │────▶│ postgres    │     │ redis        │  │
│  │ (Gunicorn)  │     │ (pgdata)    │     │ (broker)     │  │
│  └──────┬──────┘     └─────────────┘     └──────▲───────┘  │
│         │ enqueue                                  │        │
│  ┌──────▼──────────┐  ┌──────────────────┐         │        │
│  │ worker_scanner  │  │ worker_rag       │─────────┘        │
│  │ TF + LRU models │  │ embeddings+chroma│                  │
│  └────────┬────────┘  └────────┬─────────┘                  │
│           │ volume             │ volume                     │
│           ▼                    ▼                            │
│     models_data          chroma_data / kb_data              │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   Groq LLM API                   Cloudinary / HF Hub
   Tavily / weather               Safaricom Daraja (M-Pesa)
```

### 3.1 Service boundaries

| Service | Container | Responsibility | Must NOT do |
|---------|-----------|----------------|-------------|
| **Next.js** | Vercel (platform) | UI, forms, camera upload UX, i18n EN/SW, SEO landing | Load TensorFlow, hold secrets for Groq/M-Pesa |
| **nginx** | `nginx` | TLS, reverse proxy, upload size limits | Run app code |
| **Django API** | `api` | Auth, RBAC, wallets, billing gates, CRUD, partner API, enqueue jobs | Import TensorFlow / sentence-transformers |
| **Scanner worker** | `worker_scanner` | Gatekeeper + crop classify (LRU) | Accept public internet traffic |
| **RAG worker** | `worker_rag` | Embeddings + Chroma retrieve (+ optional reranker) | Accept public internet traffic |
| **PostgreSQL** | `postgres` | Source of truth for users and business data | Expose port 5432 to the public internet |
| **Redis** | `redis` | Job queue, rate-limit counters, scan job status | Expose port 6379 publicly; persist farm records |

---

## 4. Repository / Project Layout (target)

Split into two deployable units (monorepo or two repos—prefer monorepo for one team):

```
agriscan/
├── apps/
│   ├── web/                      # Next.js (deployed on Vercel)
│   └── api/                      # Django project (built into Docker images)
│       ├── Dockerfile            # shared base for api + workers
│       ├── Dockerfile.api        # optional slim API image (no TF)
│       └── Dockerfile.worker     # scanner/RAG images (TF / embeddings)
├── packages/
│   └── shared-types/             # Optional OpenAPI-generated TS types
├── docs/
│   └── service_separation_plan.md
└── infra/
    ├── docker-compose.yml        # production stack on Contabo
    ├── docker-compose.override.yml  # local dev overrides
    ├── .env.example
    ├── nginx/
    │   ├── Dockerfile
    │   └── conf.d/api.conf
    └── scripts/
        ├── deploy.sh             # pull, build, migrate, up
        └── backup-volumes.sh     # pg_dump + volume snapshots
```

**Image strategy:** prefer **two images** from one codebase:

1. `agriscan-api` — Django + DRF + Gunicorn (no TensorFlow, no torch).
2. `agriscan-worker-scanner` — Django task code + TensorFlow/Keras only.
3. `agriscan-worker-rag` — Django task code + sentence-transformers / Chroma client (no TF if possible).

Same Compose project; different `command:` / entrypoints (`gunicorn` vs `celery -A ... worker -Q scan` vs `-Q rag`).

### 4.1 Django app split (inside `apps/api`)

| Django app | Owns |
|------------|------|
| `accounts` | Users, profiles (**farmer / buyer / input agency / lending partner**), OAuth bridge, JWT |
| `scanner` | Scan jobs, logs, crop catalog metadata |
| `chat` | AgriBot sessions, message history (DB-backed, not session-only) |
| `marketplace` | Listings, market connections |
| `inputs` | Agency products (restore/reintroduce agency models), agrovet agent results cache |
| `lending` | Farm Health Score, **LendingPartnerProfile**, API key lifecycle, consent, usage logs |
| `payments` | Wallet, M-Pesa transactions, top-up |
| `rag` | Ingest CLI + retrieve used by worker |
| `inference` | Celery tasks only (thin wrappers) |

**Role clarification (avoid naming collisions):**

| Role slug | Who | Portal |
|-----------|-----|--------|
| `farmer` | Growers | Scan, chat, market, score opt-in |
| `buyer` | Produce buyers | Marketplace dashboard |
| `input_agency` | Agrovets / seed / fertiliser / pesticide firms | Product storefront |
| `lending_partner` | Banks, MFIs, SACCOs, fintech lenders | API key management + score lookup tools |

---

## 5. Next.js Frontend Rewrite

### 5.1 Principles

- **API-first:** every screen talks to Contabo via typed clients (`fetch` / TanStack Query).
- **Role-based routes:** `/farmer/*`, `/buyer/*`, `/agency/*` (inputs), `/lender/*` (lending partners), `/admin/*`.
- **Mobile-first** pages that later wrap with Capacitor without rewriting data layer.
- **No secrets in the browser** — only `NEXT_PUBLIC_API_URL`. API keys for lenders are shown once on create/rotate and stored hashed server-side.

### 5.2 Route map (feature parity)

| Next.js route | Replaces | Notes |
|---------------|----------|-------|
| `/` | `homepage.html` | Marketing ISR on Vercel; CTAs for farmer / buyer / input agency / **lender** |
| `/login` | auth templates | Shared login; redirect by role |
| `/signup/farmer`, `/signup/buyer` | auth templates | Existing roles |
| `/signup/agency` | agency signup (reintroduce) | Input suppliers |
| `/signup/lender` | **new** | Banks / MFIs / SACCOs / loan agencies |
| `/farmer/scan` | `index.html` + `/process` | Camera/file upload → multipart API |
| `/farmer/chat` | AgriBot UI in templates/JS | Streaming optional (SSE) |
| `/farmer/inputs` | fertiliser pages + agent | Show onboarded + external agrovets |
| `/farmer/market` | market + farmer listings | |
| `/farmer/profile` | farm health score, opt-in, wallet | |
| `/buyer/dashboard` | `buyer_dashboard.html` | |
| `/agency/dashboard` | agency storefront (reintroduce) | Products CRUD |
| `/lender/dashboard` | **new** | Org profile, verification status, usage stats |
| `/lender/api-keys` | **new** | Create, list, rotate, revoke score API keys |
| `/lender/score-lookup` | **new** | Optional UI to test `phone` lookup (same rules as API) |
| `/lender/docs` | **new** | Embedded API docs / curl examples for integrators |
| `/admin/revenue` | revenue dashboard | Staff-only; also approve pending lenders |
| `/privacy` | privacy policy | Static |

### 5.3 Auth bridge (Django sessions → SPA)

**Recommended for Vercel ↔ Contabo:**

1. Django issues **JWT access** (short TTL, e.g. 15m) + **refresh** (httpOnly cookie, `Secure`, `SameSite=None` for cross-site) **or**
2. BFF pattern: Next.js Route Handlers proxy to Django with server-side session (hides tokens).

For Contabo + Vercel cross-origin, prefer:

- `django-rest-framework` + `SimpleJWT` (or `dj-rest-auth`)
- CORS allowlist: `https://*.vercel.app` + production domain
- CSRF only needed if using cookie session auth; JWT Bearer avoids CSRF on API POSTs

Google OAuth: keep django-allauth on backend; Next.js redirects to Django OAuth start URL, then callback returns JWT to frontend.

### 5.4 Upload & scan UX

1. Client uploads image to `POST /api/v1/scans/` (multipart).
2. API validates auth, wallet (2 free then KSh 20), rate limit → enqueues Celery task → returns `{ job_id, status: "queued" }`.
3. Client polls `GET /api/v1/scans/{job_id}/` or subscribes to SSE until `completed` / `rejected` / `failed`.
4. Result payload includes disease label, confidence, gatekeeper pass/fail, wallet balance.

This keeps Vercel free of heavy ML and keeps Gunicorn workers free during TensorFlow `predict()`.

---

## 6. Django Backend API Surface

All JSON under `/api/v1/`. Preserve the existing partner score path for banks (`GET /api/v1/lending/score/`).

### 6.1 Auth & profiles

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register/farmer/` | Farmer signup |
| POST | `/auth/register/buyer/` | Buyer signup |
| POST | `/auth/register/agency/` | Input agency (agrovet) signup |
| POST | `/auth/register/lender/` | **Lending / loan agency signup** |
| POST | `/auth/login/` | Issue tokens (all roles) |
| POST | `/auth/refresh/` | Refresh access |
| POST | `/auth/logout/` | Invalidate refresh |
| GET/PATCH | `/me/` | Current user + role profile |
| POST | `/auth/password-reset/` | Email reset (SendGrid) |

**`POST /auth/register/lender/` body (indicative):**

```json
{
  "email": "risk@bank.co.ke",
  "password": "...",
  "organization_name": "Example MFI Ltd",
  "organization_type": "mfi",
  "registration_number": "CBR-12345",
  "contact_phone": "+2547...",
  "county": "Nairobi",
  "website": "https://..."
}
```

`organization_type` examples: `bank`, `mfi`, `sacco`, `fintech`, `other`.

On success: create `User` + `LendingPartnerProfile` with `verification_status=pending`. Login works immediately for the portal; **score API keys cannot be used** until an admin sets status to `approved` (auto-approve allowed in sandbox).

### 6.2 Crop scanner

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/crops/` | Supported crops + class labels |
| POST | `/scans/` | Create scan job (image + crop) |
| GET | `/scans/{id}/` | Job status + result |
| GET | `/scans/` | Farmer scan history |

### 6.3 AgriBot

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/chat/sessions/` | Start / clear session |
| POST | `/chat/sessions/{id}/messages/` | Send message (wallet gate) |
| GET | `/chat/sessions/{id}/messages/` | History (DB-backed) |

Response shape stays compatible with current AgriBot JSON (`overview`, `recommendations`, …).

### 6.4 Inputs & agent

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/inputs/products/` | Onboarded agency products |
| POST | `/inputs/discover/` | Run agrovet agent for county/query (cached) |
| GET | `/inputs/discover/{job_id}/` | Async agent result |

### 6.5 Marketplace & farmer score (farmer-facing)

| Method | Path | Purpose |
|--------|------|---------|
| CRUD | `/marketplace/listings/` | Farmer produce visibility |
| POST | `/marketplace/connections/` | Buyer↔farmer link |
| GET | `/farmers/me/health-score/` | Recalculate/read score |
| PATCH | `/farmers/me/lending-consent/` | Opt-in flag |

### 6.6 Lending partners — portal + Farm Health Score API

Evolve today’s admin-only `PartnerAPIKey` into a first-class **lending partner** account so loaning agencies authenticate and self-manage score API access.

#### Data model (target)

```text
LendingPartnerProfile
  user (OneToOne User)
  organization_name
  organization_type          # bank | mfi | sacco | fintech | other
  registration_number
  contact_phone, county, website
  verification_status        # pending | approved | suspended | rejected
  verified_at, verified_by (admin)
  created_at

LendingAPIKey                # replaces/extends PartnerAPIKey
  partner (FK LendingPartnerProfile)
  name                       # e.g. "Production", "Staging"
  key_prefix                 # first 8 chars for UI display
  key_hash                   # store hash only; raw key shown once
  is_active
  last_used_at
  created_at, expires_at?

LendingAPIUsageLog (optional but recommended)
  api_key, phone_queried (hashed/normalized), http_status, created_at
```

Migration path: existing `PartnerAPIKey` rows → attach to a bootstrap `LendingPartnerProfile`, or require re-registration in staging.

#### Lender-authenticated endpoints (JWT — portal UI)

| Method | Path | Purpose |
|--------|------|---------|
| GET/PATCH | `/lender/me/` | Organization profile |
| GET | `/lender/api-keys/` | List keys (prefix + meta only; never full secret) |
| POST | `/lender/api-keys/` | Create key — response includes **raw key once** |
| POST | `/lender/api-keys/{id}/rotate/` | Issue new secret; invalidate old |
| POST | `/lender/api-keys/{id}/revoke/` | Deactivate key |
| GET | `/lender/usage/` | Recent lookup volume / errors |
| GET | `/lender/score/?phone=` | Same score payload as public API, auth via JWT (dashboard test tool) |

Guards:

- `verification_status == approved` required to create keys and look up scores.
- Suspended partners: keys forced inactive; score returns `403`.

#### Machine-to-machine score API (unchanged path; Bearer API key)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/lending/score/?phone=` | Partner integration (`Authorization: Bearer <api_key>`) |

Behaviour preserved:

1. Resolve key → active `LendingAPIKey` + approved partner.
2. Find farmer by phone; require `FarmHealthProfile.opt_in_for_lending`.
3. Return score, risk tier, scan count, connections (no raw PII beyond contract).
4. Log usage for billing / abuse monitoring.

#### Admin lender moderation

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/lenders/` | List pending/approved partners |
| POST | `/admin/lenders/{id}/approve/` | Activate partner for API use |
| POST | `/admin/lenders/{id}/suspend/` | Kill access |

### 6.7 Payments & admin

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/wallet/` | Balance + trial counters |
| POST | `/mpesa/topup/` | STK push |
| POST | `/mpesa/callback/` | Daraja webhook (IP allowlist) |
| GET | `/admin/revenue/` | Staff metrics |

M-Pesa callback **must stay on Contabo** (public HTTPS via Nginx)—never on Vercel.

### 6.8 Lender signup → API use (end-to-end)

```
1. Lender registers at /signup/lender  →  POST /auth/register/lender/
2. Logs in  →  JWT  →  /lender/dashboard (status: pending)
3. AgriScan admin approves  →  verification_status=approved
4. Lender opens /lender/api-keys  →  POST /lender/api-keys/
      ← raw key shown once (copy into bank middleware)
5. Bank system calls:
      GET /api/v1/lending/score/?phone=2547...
      Authorization: Bearer <api_key>
6. Only farmers with lending opt-in return score data
```

Optional commercial layer later: per-query fees or subscription tied to `LendingAPIUsageLog` (B2B API licensing).

---

## 7. Model Loading Strategy (Protect the Contabo VPS)

Goal: keep inference correct without loading **all** crop models + embeddings + reranker into RAM at once.

### 7.1 What actually burns RAM

| Asset | Approx. memory (order of magnitude) | Load policy |
|-------|--------------------------------------|-------------|
| EfficientNetB0 gatekeeper | ~20–40 MB + TF runtime | **Singleton**, load once per worker process |
| One MobileNetV2 `.h5` crop model | ~10–30 MB each | **LRU cache**, max N in memory |
| All 11 crop models at once | Easily 200 MB+ weights + TF graphs | **Do not preload all** |
| `all-MiniLM-L6-v2` | ~80–120 MB | Singleton in RAG worker only |
| Cross-encoder reranker | ~80–120 MB | Singleton in RAG worker; optional disable under memory pressure |
| Groq LLM | 0 on VPS | Always remote |
| Gunicorn web workers × TF | Multiplies everything | **Never import TF in web workers** |

### 7.2 Process isolation (mandatory — via separate containers)

```
container api              → no tensorflow, no sentence-transformers
container worker_scanner   → TF + gatekeeper + crop LRU only (Celery -Q scan)
container worker_rag       → embeddings + chroma + optional reranker (Celery -Q rag)
```

Docker enforces isolation better than one VM with many processes: each worker gets its own cgroup memory limit so a TF OOM kills/restarts **only** that container.

**On the selected 8 GB VPS:** prefer **separate** `worker_scanner` + `worker_rag` with tight `mem_limit`s and concurrency `1`. Only merge into a single `worker_all` if measured RSS still OOMs after disabling the reranker.

### 7.3 Crop model LRU (replace unbounded `loaded_models`)

Current code caches every loaded path forever (`views.loaded_models`). On Contabo, replace with:

```text
MAX_LOADED_CROP_MODELS = 2   # required on the selected 8 GB VPS (raise only after upgrade to 16 GB+)
```

Algorithm:

1. On scan: resolve crop → `hf_hub_download` or local `CropModels/{crop}.h5`.
2. If model in LRU → reuse.
3. If cache full → **unload** least-recently-used model (`del` + `gc.collect()`; clear TF session if needed).
4. Load new model with `compile=False` (already done).
5. Run `predict` under a **process-wide lock** so two Celery tasks never expand TF graphs concurrently in the same process.

Persist weights on a Docker named volume (`models_data` → `/models`) so HF is not hit on every container recreate.

### 7.4 Gatekeeper

- Load **once** per scanner worker at process start **or** on first scan.
- Do not reload ImageNet weights per request.
- Keep float32 policy as today to avoid mixed-precision surprises.

### 7.5 RAG / embeddings

- Load embedding model **once** per RAG worker (`rag.retrieve` already uses a module-level bundle).
- **On 8 GB Contabo (selected):** default `RERANKER_ENABLED=false` so AgriBot uses hybrid vector+BM25 only. Re-enable the cross-encoder only after watching free RAM under load.
- Cap Chroma/OpenBLAS/OMP threads:

```bash
OMP_NUM_THREADS=1
TF_NUM_INTEROP_THREADS=1
TF_NUM_INTRAOP_THREADS=1
TOKENIZERS_PARALLELISM=false
```

### 7.6 Queue & backpressure

| Control | Setting |
|---------|---------|
| Celery concurrency (scanner container) | **`1` only** on 8 GB (never 2 until RAM upgrade) |
| Celery concurrency (RAG container) | **`1`** |
| Max queued scan jobs | e.g. 20 on 8 GB (reject with HTTP 503 + retry-after when full) |
| Scan rate limit | Keep `5/m` per user (migrate from django-ratelimit) |
| Chat rate limit | Keep `10/m` |
| Job timeout | Kill TF job after e.g. 60s |
| Soft memory limit | Compose `mem_limit` / `deploy.resources.limits.memory` per container; Docker restarts OOM’d workers |

### 7.7 Inference request lifecycle

```
Next.js → POST /scans/ → api container validates wallet
                      → Redis container queue "scan"
                      → worker_scanner: gatekeeper → LRU crop model → predict
                      → Write CropScanLog + debit wallet
                      → Mark job complete
Next.js ← poll GET /scans/{id}/
```

AgriBot:

```
Next.js → POST /chat/.../messages/
       → api container wallet gate
       → worker_rag: retrieve_context (local volume)
       → api container: Groq generate (network I/O only)
       → Persist messages + debit
```

Generation stays on Groq so Contabo only pays for **retrieval** CPU/RAM, not LLM weights.

### 7.8 Selected Contabo VPS (starting hardware)

| Spec | Value |
|------|-------|
| CPU | **4 vCPU cores** |
| RAM | **8 GB** |
| Disk | **100 GB SSD** (expandable) |
| Network | **200 Mbit/s** |
| Snapshot | **1** (use for pre-deploy rollback) |

This size is enough for **pilot / early production** if inference is strictly Docker-isolated and models are LRU-capped. It is **tight**: concurrent heavy scans + RAG will queue, not parallelize.

#### Target Compose layout on this box

| Container | vCPU share (soft) | `mem_limit` | Notes |
|-----------|-------------------|-------------|--------|
| `postgres` | 0.5 | **1g** | Shared buffers kept modest |
| `redis` | 0.25 | **256m** | Broker + short job status only |
| `nginx` | 0.25 | **128m** | TLS + reverse proxy |
| `api` | 1.0 | **768m–1g** | Gunicorn **2 workers** (not 3–4) |
| `worker_scanner` | 1.0–1.5 | **2.5g** | TF + gatekeeper + `MAX_LOADED_CROP_MODELS=2`, `-c 1` |
| `worker_rag` | 1.0 | **1.5g–2g** | Embeddings + Chroma; **reranker off** |
| Host OS + Docker + page cache | — | leave **~1–1.5 GB** unallocated | Avoid total mem_limits summing to full 8 GB |

**Hard rules for this VPS:**

1. Never import TensorFlow in `api`.
2. Scanner and RAG concurrency = **1** each.
3. `RERANKER_ENABLED=false` until you upgrade RAM or prove headroom.
4. Prefer async scan jobs + polling so API stays responsive when the scanner is busy.
5. Use the Contabo **snapshot** before first production cutover and before major image upgrades.
6. Disk: 100 GB is fine for Postgres + models (~few GB) + Chroma + logs; enable log rotation and scheduled `docker system prune`. Expand SSD when `pgdata` or backups grow.
7. 200 Mbit/s is ample for JSON + leaf images (≤5 MB); not a bottleneck vs CPU/RAM.

#### Scaling path (when to upgrade)

| Symptom | Action |
|---------|--------|
| Frequent `worker_scanner` OOM restarts | Upgrade to **16 GB**, or convert models to TFLite/ONNX |
| Scan queue always backed up | Add RAM first, then second scanner worker |
| Want cross-encoder quality | Move to **16 GB** and turn `RERANKER_ENABLED=true` |
| Need more parallel API traffic | More Gunicorn workers only after RAM upgrade |

#### Comparison table (reference)

| VPS RAM | `api` Gunicorn workers | `worker_scanner` | `worker_rag` | `MAX_LOADED_CROP_MODELS` | Reranker |
|---------|------------------------|------------------|--------------|--------------------------|----------|
| **8 GB (selected)** | **2** | 1 container, conc=1 | 1 container, conc=1 | **2** | **Off** |
| 16 GB | 3–4 | 1 container, conc=1–2 | 1 container | 3 | On |
| 32 GB+ | 4+ | 1–2 containers | 1–2 containers | 4–6 | On |

Prefer **vertical headroom** over many concurrent TF containers.

### 7.9 Optional later optimizations

1. Convert `.h5` → **TFLite** or ONNX Runtime for lower RAM and faster CPU inference.
2. Move gatekeeper to a tiny ONNX model.
3. Migrate Chroma → **pgvector** on the Postgres container to drop a second datastore.
4. GPU Contabo instance only if scan volume justifies it (not required for MobileNetV2 CPU).

---

## 8. Contabo VPS Hosting Plan (all services in Docker)

### 8.1 Host vs containers

| On the bare VPS (host) | In Docker Compose |
|------------------------|-------------------|
| Ubuntu LTS + Docker Engine + Compose plugin | `nginx`, `certbot` (or nginx-proxy + acme-companion) |
| UFW / Fail2ban (SSH + 80/443 only) | `postgres`, `redis` |
| Volume backup cron calling `docker compose exec` | `api`, `worker_scanner`, `worker_rag` |
| — | Named volumes: `pgdata`, `redisdata`, `models_data`, `chroma_data`, `kb_data`, `media_tmp` |

**Do not** install Postgres, Redis, or Gunicorn as host packages in production.

### 8.2 Compose services (canonical)

```yaml
# infra/docker-compose.yml (conceptual outline)
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env
    volumes:
      - pgdata:/var/lib/postgresql/data
    mem_limit: 1g
    networks: [agriscan_net]
    # no ports: published — only reachable by other containers
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--save", "60", "1", "--loglevel", "warning"]
    volumes:
      - redisdata:/data
    mem_limit: 256m
    networks: [agriscan_net]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile.api
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    networks: [agriscan_net]
    # exposed only on the compose network; nginx reaches api:8000
    command: >
      gunicorn AgriProject.wsgi:application
      --bind 0.0.0.0:8000 --workers 2 --timeout 60
    mem_limit: 1g

  worker_scanner:
    build:
      context: ../apps/api
      dockerfile: Dockerfile.worker
      args: { WORKER_KIND: scanner }
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      MAX_LOADED_CROP_MODELS: "2"
      OMP_NUM_THREADS: "1"
      TF_NUM_INTRAOP_THREADS: "1"
      TF_NUM_INTEROP_THREADS: "1"
    volumes:
      - models_data:/models
    mem_limit: 2.5g
    cpus: "1.5"
    depends_on: [redis, postgres, api]
    networks: [agriscan_net]
    command: celery -A AgriProject worker -Q scan -c 1 -l INFO

  worker_rag:
    build:
      context: ../apps/api
      dockerfile: Dockerfile.worker
      args: { WORKER_KIND: rag }
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      RERANKER_ENABLED: "false"
      OMP_NUM_THREADS: "1"
      TOKENIZERS_PARALLELISM: "false"
    volumes:
      - chroma_data:/app/chroma_db
      - kb_data:/app/Data
    mem_limit: 1.75g
    cpus: "1.0"
    depends_on: [redis, postgres]
    networks: [agriscan_net]
    command: celery -A AgriProject worker -Q rag -c 1 -l INFO

  nginx:
    build: ./nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    depends_on: [api]
    networks: [agriscan_net]

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    # renew via cron on host: docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload

volumes:
  pgdata:
  redisdata:
  models_data:
  chroma_data:
  kb_data:
  certbot_www:
  certbot_certs:

networks:
  agriscan_net:
    driver: bridge
```

### 8.3 Networking rules

1. **Publish only** `nginx` ports `80`/`443` to the host.
2. `postgres:5432` and `redis:6379` stay on `agriscan_net` (no `ports:` mapping).
3. Containers talk by **Compose service DNS names** (`postgres`, `redis`, `api`).
4. M-Pesa callback hits `https://api.domain/...` → nginx → `api:8000`.
5. Vercel never connects to Postgres/Redis directly—only to the public API hostname.

### 8.4 Nginx (container) sketch

- Upstream `api:8000` (Compose DNS).
- `client_max_body_size 6m;` (scans max 5 MB + overhead).
- Prefer short-lived API + async jobs over long proxy timeouts.
- TLS certificates via Certbot volume mount shared with `nginx`.

### 8.5 Environment & secrets

Store production secrets in `infra/.env` on the VPS (mode `600`, never commit):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SECRET_KEY`, `DATABASE_URL` (or assemble from Postgres vars inside Compose)
- `REDIS_URL`
- `GROQ_API_KEY`, `TAVILY_API_KEY`, weather keys
- `HF_MODEL_REPO_ID`, `CLOUDINARY_URL`
- M-Pesa Daraja credentials
- `CORS_ALLOWED_ORIGINS=https://agriscan.vercel.app,https://www.yourdomain.com`
- `MAX_LOADED_CROP_MODELS`, `RERANKER_ENABLED`

Pass via `env_file:` — do not bake secrets into images.

### 8.6 Deploy / migrate / backup workflow

```bash
# on Contabo
cd /opt/agriscan/infra
docker compose pull          # or build
docker compose run --rm api python manage.py migrate
docker compose run --rm api python manage.py collectstatic --noinput
docker compose up -d
docker compose ps
docker compose logs -f api worker_scanner worker_rag
```

Backups:

- `docker compose exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
- Periodic copy/snapshot of volumes `pgdata`, `chroma_data`, `models_data`
- Test restore on a staging Compose stack before trusting backups

One-off RAG ingest:

```bash
docker compose run --rm worker_rag python -m rag.ingest
```

### 8.7 Vercel ↔ Contabo connectivity

1. Frontend env: `NEXT_PUBLIC_API_URL=https://api.agriscan.example.com`
2. Django `CORS_ALLOWED_ORIGINS` + `CSRF_TRUSTED_ORIGINS` for the Vercel domain
3. Optional Cloudflare in front of nginx for DDoS
4. Health: `GET /api/v1/health/` checks Postgres + Redis from inside `api` (not model load)

DNS: apex/www → Vercel; `api` → Contabo A record → host → nginx container.

### 8.8 Local development parity

Developers run the **same Compose file** with `docker-compose.override.yml` (hot reload, published Postgres port for GUI tools, lighter worker images). Next.js still runs on the laptop or a Vercel preview; it points at `http://localhost` via published nginx or a published `api:8000` for local-only.

---

## 9. Data Migration

1. Bring up Compose on Contabo (`postgres` healthy).
2. Dump current SQLite/`db.sqlite3` (or Railway Postgres) → `docker compose exec -T postgres psql ...` restore, or `docker compose run --rm api` load script.
3. Run migrations inside the `api` container; verify `FarmerProfile`, `Wallet`, `CropScanLog`, etc.
4. Copy knowledge files into `kb_data` / `chroma_data` volumes; re-run ingest via `worker_rag` container if manifest version changes.
5. Seed `models_data` volume with `CropModels/*.h5` (or let HF cache fill it on first scans).
6. Re-test M-Pesa **sandbox** callbacks against the new public nginx URL before production keys.

Agency models were removed in migration `0013`; the rewrite should **reintroduce** `AgencyProfile` / `AgencyProduct` / subscriptions as first-class API resources for the inputs marketplace.

---

## 10. Phased Implementation

### Phase 0 — Prep (3–5 days)

- Freeze feature list and OpenAPI draft from §6.
- Provision selected Contabo VPS (**4 vCPU / 8 GB / 100 GB / 200 Mbit/s**); install Docker Engine + Compose; configure UFW; take **snapshot #1**.
- Commit `infra/docker-compose.yml` with **8 GB memory budgets** (§7.8), Dockerfiles, `.env.example`.
- Decide monorepo vs two repos.

### Phase 1 — API extraction + Docker stack (1–2 weeks)

- Add DRF + JWT without deleting templates yet.
- Move scan / chat / wallet / lending behind `/api/v1/` JSON.
- Implement `LendingPartnerProfile` + `LendingAPIKey` (migrate from `PartnerAPIKey`) and register/lender + key CRUD endpoints.
- Introduce Celery queues; TF only in `worker_scanner` image.
- Implement crop LRU + container memory limits (§7–§8).
- Deploy full Compose stack to Contabo staging; smoke-test health + one scan job.

### Phase 2 — Next.js parity (2–3 weeks)

- Scaffold App Router + auth + role layouts (farmer, buyer, input agency, **lender**).
- Port scan, AgriBot, inputs/agent, market, profile, buyer, admin pages.
- Ship `/signup/lender`, `/lender/dashboard`, `/lender/api-keys`, score test tool + docs.
- Wire wallet modal + M-Pesa top-up against Contabo nginx.
- Cut over DNS; deprecate Django templates.

### Phase 3 — Hardening (1 week)

- Load tests: concurrent scans vs chat against Docker workers.
- Tune `mem_limit` / restart policies; verify OOM isolation.
- Partner API contract tests; backup/restore drill for `pgdata`.
- Security: CORS lockdown, callback checks, rate limits, no DB/Redis ports published.

### Phase 4 — Product completion extras

- Capacitor wrap of Next.js.
- USSD/SMS gateway calling the same Django API.
- Agency subscription billing finalization.

---

## 11. Feature Ownership Matrix (post-split)

| Feature | Next.js (Vercel) | `api` container | Worker containers | External |
|---------|------------------|-----------------|-------------------|----------|
| Crop scanner UI | ✓ | job create/status | `worker_scanner` | HF Hub (weights) |
| AgriBot UI | ✓ | sessions, wallet, Groq | `worker_rag` | Groq |
| Agrovet agent | ✓ | cache + jobs | `worker_rag` or api | Tavily + Groq |
| Marketplace | ✓ | CRUD | — | — |
| Farm Health Score (farmer) | ✓ opt-in / view | scoring | — | — |
| Lending partner signup + API keys | ✓ `/signup/lender`, `/lender/*` | profiles, key lifecycle, admin approve | — | Banks / MFIs / SACCOs |
| Score M2M API | — (server-to-server) | Bearer key + consent check | — | Lender middleware |
| M-Pesa wallet | ✓ | STK + callback + wallet | — | Daraja |
| Auth / OAuth | ✓ | tokens + allauth | — | Google |
| Media | upload UX | Cloudinary | — | Cloudinary |
| Postgres / Redis | — | clients only | clients only | Docker images on Contabo |

---

## 12. Success Criteria

- [ ] Vercel frontend can complete farmer signup → scan → AgriBot → top-up without Django templates.
- [ ] Lending / loan agency can self-register at `/signup/lender`, log in, and (after admin approval) create/rotate/revoke API keys.
- [ ] Machine clients can fetch Farm Health Score with Bearer keys issued from the lender portal; unapproved partners and non-consenting farmers are rejected.
- [ ] Contabo runs **only** Dockerized backend services (Postgres, Redis, api, workers, nginx); no host-installed DB/app daemons.
- [ ] `api` image never contains / imports TensorFlow.
- [ ] Postgres and Redis ports are **not** published to the public internet.
- [ ] Peak RSS of `worker_scanner` stays under its Compose `mem_limit` during mixed crop scans.
- [ ] At most `MAX_LOADED_CROP_MODELS` crop networks resident at once.
- [ ] Partner lending endpoint path `/api/v1/lending/score/` remains backward compatible.
- [ ] M-Pesa callback credits wallet reliably via nginx → `api`.
- [ ] AgriBot EN/SW JSON responses and wallet freemium rules unchanged.
- [ ] Documented backup/restore of Docker volumes works on a clean VPS.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| VPS OOM from TF + embeddings on **8 GB** | Separate workers, LRU=2, concurrency 1, `mem_limit`, **reranker off**, leave ~1.5 GB host free |
| Cross-origin auth bugs | Prefer JWT + documented CORS; test preview deployments |
| Slow first scan (cold model load) | Warm gatekeeper on worker boot; persist models in `models_data` volume |
| HF download latency | Pre-seed `models_data` during deploy |
| Long request timeouts on Vercel | Async jobs + polling (Vercel does not run ML) |
| Docker disk fill (images/volumes) | Prune policy, volume backups off-box, log rotation |
| Accidental public DB ports | Compose review checklist; UFW default deny |

---

## 14. Immediate Next Steps

1. Provision the selected Contabo VPS (**4 vCPU / 8 GB / 100 GB**) and take the first **snapshot** after base Docker + UFW setup.
2. Author `infra/docker-compose.yml` tuned for 8 GB (§7.8 + §8.2): Gunicorn 2 workers, scanner `mem_limit=2.5g`, RAG `1.75g`, reranker off.
3. Draft OpenAPI from §6 (include **lender register + API key** routes) and generate TS client for Next.js.
4. Implement Celery scan task + LRU loader (`MAX_LOADED_CROP_MODELS=2`); run it only in `worker_scanner`.
5. Scaffold `apps/web` Next.js with role signup including `/signup/lender` and `/lender/*` portal.
6. Load-test scan+chat on this box; upgrade to 16 GB only if OOM or queue latency becomes the bottleneck.

---

*AgriScan — Vercel for the product UI; Contabo Docker Compose for every backend service, so databases, API, and inference stay isolated, portable, and recoverable.*
