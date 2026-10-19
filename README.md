# Ukulima Bora

AI crop diagnosis, Kiswahili/English advice, KAMIS market prices, agrovet inputs, and Farm Health Scores for Kenyan smallholders.

**Production:** [ukulimabora.co.ke](https://ukulimabora.co.ke)  
**Stack:** Next.js on Vercel · Django API / Celery workers on Contabo (Docker) · Capacitor Android wrap

### What the product does

| For | Capabilities |
| --- | --- |
| **Farmers** | Leaf scan, AgriBot, crop advisor, KAMIS market prices, agrovet marketplace, wallet (M-Pesa), Farm Health Score |
| **Input agencies** | List fertiliser / seed / crop-protection products |
| **Lenders** | Consent-based Farm Health Score API |
| **Admin** | Users, products, revenue, modules |

**Out of scope:** connecting farmers to produce buyers. Market support is **price intelligence (KAMIS)** plus the **inputs storefront** only.

### Repo layout

```
crop_AI_analyzer/
├── apps/
│   ├── api/          # Django 5 + DRF + Celery (scanner / RAG workers)
│   └── web/          # Next.js App Router + Capacitor (android/)
├── infra/            # Docker Compose, nginx, deploy / backup scripts
├── docs/             # Concept note, system docs, deployment guide, roadmap
├── manage.py         # Shim → apps/api/manage.py
└── packages/         # shared types (optional)
```

---

## Run locally

You need **two terminals**: API on `:8000`, web on `:3000`.

### 1. Prerequisites

- Python 3.10+
- Node.js 20+ (npm)
- Repo-root `.env` with at least `DEV_ENV=True` and `SECRET_KEY`  
  (optional for laptop work: `GROQ_API_KEY`, `OPEN_WEATHER_API_KEY`, Cloudinary, etc.)
- Web env: copy `apps/web/.env.local.example` → `apps/web/.env.local`

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

With `DEV_ENV=True`, Django uses relaxed CORS/SSL/throttles and LocMem cache (Redis not required on a laptop). SQLite is used when Postgres is unreachable.

### 2. API (Django)

From the **repo root**:

```bash
# Create / activate a venv (once)
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install API deps (full stack; slower first time)
pip install -r apps/api/requirements.txt

# Migrate and run
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Or from `apps/api`:

```bash
cd apps/api
source ../../.venv/bin/activate    # or your own venv
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Checks:

- Health: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/) — expect `"dev_env": true`
- Admin (after `createsuperuser`): [http://localhost:8000/admin/](http://localhost:8000/admin/)

Optional:

```bash
python manage.py createsuperuser
python manage.py ingest_kamis_prices   # refresh local KAMIS SQLite cache
python manage.py test accounts.tests   # contract / role tests
```

### 3. Web (Next.js)

```bash
cd apps/web
cp .env.local.example .env.local   # if you do not already have .env.local
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Farmer signup: [http://localhost:3000/signup?role=farmer](http://localhost:3000/signup?role=farmer)
- Market prices (logged-in farmer): `/farmer/market`
- Inputs marketplace: `/marketplace`
- USSD demo: homepage → **Try phone (USSD) demo**

### 4. Typical local flow

1. Start API (`:8000`) and web (`:3000`).
2. Sign up as **Farmer** (or Agency / Lender).
3. Scan a leaf, open AgriBot, check **Market prices**, browse **Marketplace**.
4. Staff: create a superuser and open `/admin` (Django) or the Next admin portal after a staff login.

Set `DEV_ENV=False` before any Contabo / production deploy.

---

## Docker Compose (Contabo / local parity)

Production-shaped stack (Postgres, Redis, API, workers, nginx):

```bash
cd infra
cp .env.example .env    # fill secrets; DEV_ENV=False in prod
chmod +x scripts/*.sh
docker compose -f docker-compose.yml up -d --build
```

Full VPS steps: **[docs/deploymentguide.md](docs/deploymentguide.md)**.

---

## Capacitor (Android)

```bash
# API + Next already running
cd apps/web
# Emulator → host API:
# NEXT_PUBLIC_API_URL=http://10.0.2.2:8000
npm run cap:sync
npm run cap:android
```

---

## USSD

Homepage simulator and `POST /api/v1/ussd/simulate/` share the menu engine with  
`POST /api/v1/ussd/` (Africa's Talking `CON`/`END`). Live telecom cutover: set `USSD_PROVIDER` + keys and point the webhook at `/api/v1/ussd/`.

---

## Docs

| Document | Contents |
| -------- | -------- |
| [docs/concept_note.md](docs/concept_note.md) | Product concept (prices, not buyer matching) |
| [docs/SYSTEM_DOCUMENTATION.md](docs/SYSTEM_DOCUMENTATION.md) | Architecture and APIs |
| [docs/summary.md](docs/summary.md) | Executive summary |
| [docs/project_status_and_roadmap.md](docs/project_status_and_roadmap.md) | Current status and roadmap |
| [docs/deploymentguide.md](docs/deploymentguide.md) | Contabo + Vercel deploy |
| [docs/competitive_landscape.md](docs/competitive_landscape.md) | Competitors |
