# Local testing procedure (every feature before production)

Use this checklist on your laptop with **`DEV_ENV=True`**. That flag relaxes CORS, SSL redirects, host checks, and API throttles so Next.js, Capacitor, and the USSD simulator can talk to Django without production lockdown.

---

## 0. One-time setup

### Env files

```bash
# Repo root (or apps/api/.env symlink)
# Ensure:
DEV_ENV=True
DEBUG=True
SECRET_KEY=any-dev-secret
GROQ_API_KEY=...          # AgriBot
# optional Redis if you run Celery workers:
REDIS_URL=redis://127.0.0.1:6379/0
```

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
# Android emulator → host machine API:
# NEXT_PUBLIC_API_URL=http://10.0.2.2:8000
```

```bash
# infra/.env  (only if using Docker Compose)
cp infra/.env.example infra/.env
# set POSTGRES_PASSWORD, SECRET_KEY, DEV_ENV=True, CORS origins
```

### Install

```bash
# API
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-api.txt
python manage.py migrate

# Web
cd apps/web
npm install
```

---

## 1. Start the stack (laptop, no Docker)

**Terminal A — API**

```bash
cd apps/api && source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

Confirm: `GET http://localhost:8000/api/v1/health/` → JSON with `"dev_env": true`.

**Terminal B — Redis + Celery** (needed for real crop scans)

```bash
redis-server   # or: docker run -p 6379:6379 redis:7-alpine

cd apps/api && source .venv/bin/activate
celery -A AgriProject worker -Q scan -c 1 -l INFO
# optional RAG worker:
celery -A AgriProject worker -Q rag -c 1 -l INFO
```

Without workers, signup/login/chat/USSD/lender still work; scan jobs stay `queued`.

**Terminal C — Next.js**

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

### Or Docker parity

```bash
cd infra
docker compose up -d --build
# API via override on :8000; Next still on laptop pointing at localhost:8000
```

---

## 2. Feature checklist (UI + API)

### Marketing / USSD sim

| Step | Expected |
|------|----------|
| Home `/` | Brand hero loads |
| Click **Try USSD demo** | Phone UI scrolls into view |
| Dial `*384*55#` | Main menu (wallet, AgriBot, market, inputs, score, consent, profile) |
| Choose `1` | Demo wallet (or real balance if phone matches a farmer) |
| Choose `2` → type question → Send/`#` | Short AgriBot tip |
| Note | Crop scan is **excluded** from USSD by design |

### Auth

| Role | Path | Check |
|------|------|-------|
| Farmer | `/signup/farmer` | JWT issued → `/farmer/scan` |
| Buyer | `/signup/buyer` | → `/buyer/dashboard` |
| Agency | `/signup/agency` | → `/agency/dashboard` |
| Lender | `/signup/lender` | → `/lender/dashboard` (pending) |
| Login | `/login` | Redirect by role |

### Farmer portal

| Feature | Path | Check |
|---------|------|-------|
| Scan | `/farmer/scan` | Upload leaf → job polled → result (needs Celery + models) |
| AgriBot | `/farmer/chat` | Message → JSON advice (needs `GROQ_API_KEY`) |
| Inputs | `/farmer/inputs` | List/search (legacy endpoint OK in DEV) |
| Market | `/farmer/market` | Firms list |
| Profile / wallet | `/farmer/profile` | Balance; STK top-up needs Daraja sandbox |

### Buyer / agency

| Feature | Path | Check |
|---------|------|-------|
| Buyer | `/buyer/dashboard` | Farmer list from API |
| Agency | `/agency/dashboard` | Profile visible (product CRUD still stub) |

### Lender + admin

| Step | Check |
|------|-------|
| Lender pending | Cannot create API keys |
| Create staff user | `python manage.py createsuperuser` then set `is_staff=True` |
| `/admin/lenders` | Approve partner |
| `/lender/api-keys` | Create key — copy raw secret once |
| `/lender/score-lookup` | Phone of consenting farmer → score JSON |
| M2M | `curl -H "Authorization: Bearer <key>" "http://localhost:8000/api/v1/lending/score/?phone=2547..."` |

Farmer must set **lending consent** (profile or USSD option 6) or score returns 403.

### Admin revenue

`/admin/revenue` may still be a stub — skip or verify against Django `/admin/revenue/` if needed.

---

## 3. Automated API contract tests

```bash
cd apps/api && source .venv/bin/activate
DEV_ENV=True python manage.py test accounts.tests -v 2
```

Covers: LendingAPIKey M2M score, consent gate, legacy PartnerAPIKey fallback, USSD simulate menu.

---

## 4. Capacitor (Android) wrap

Prereqs: Android Studio, JDK 17+, device/emulator.

```bash
# Terminals A+C running (API + Next)
cd apps/web

# Emulator talks to host via 10.0.2.2 — set in .env.local:
# NEXT_PUBLIC_API_URL=http://10.0.2.2:8000
# CAPACITOR_SERVER_URL=http://10.0.2.2:3000   # optional rebuild of capacitor.config

npm run cap:sync
npm run cap:android   # opens Android Studio → Run
```

`DEV_ENV=True` + cleartext network config lets the WebView hit `http://10.0.2.2:8000` without CORS blocks.

Physical phone: use your LAN IP (`http://192.168.x.x:3000` / `:8000`) and ensure firewall allows it.

Camera permission is declared for native scan later; HTML `capture` also works in the WebView.

---

## 5. Backup / restore drill (Compose)

```bash
cd infra
./scripts/backup-volumes.sh
# → infra/backups/pg_*.sql

./scripts/restore-volumes.sh ./backups/pg_YYYYMMDDTHHMMSSZ.sql
# type RESTORE when prompted
```

---

## 6. Before production (flip DEV_ENV off)

Set on Contabo / `infra/.env`:

```bash
DEV_ENV=False
DEBUG=False
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,https://api.yourdomain.com
ALLOWED_HOSTS=api.yourdomain.com
SECURE_SSL_REDIRECT=True
MPESA_CALLBACK_ALLOWLIST=   # Safaricom egress CIDRs when known
USSD_PROVIDER=africastalking   # or twilio | textsms
AFRICASTALKING_API_KEY=...     # webhook header X-AgriScan-USSD-Secret
# Point provider callback URL → https://api.yourdomain.com/api/v1/ussd/
```

Capacitor prod: set `server.url` to the Vercel URL (or ship a static `out/` export) and rebuild the APK.

---

## Quick smoke script

```bash
# health
curl -s http://localhost:8000/api/v1/health/ | jq

# USSD sim
curl -s -X POST http://localhost:8000/api/v1/ussd/simulate/ \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"t1","phone_number":"254700000000","text":""}' | jq
```
