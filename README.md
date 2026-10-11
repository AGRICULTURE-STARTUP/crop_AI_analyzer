# AgriScan monorepo

Next.js  (Vercel) + Django API / workers (Contabo Docker) + Capacitor Android wrap.

```
agriscan/
├── apps/
│   ├── api/          # Django 5 + DRF + Celery task code
│   └── web/          # Next.js + Capacitor (android/)
├── infra/            # Compose, nginx, deploy/backup scripts
├── docs/
│   ├── service_separation_plan.md
│   └── LOCAL_TESTING.md   # ← full local QA checklist
└── packages/         # shared-types 


## Local testing (recommended)

Follow **[docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md)** end-to-end.

Quick path with `DEV_ENV=True` (already in root `.env` for laptop work):

```bash
# API
cd apps/api && source .venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Web (other terminal)
cd apps/web && npm install && npm run dev
```

- UI: [http://localhost:3000](http://localhost:3000)  
- Health: `GET /api/v1/health/` (shows `"dev_env": true`)  
- USSD sim: homepage → **Try USSD demo**  
- Contract tests: `python manage.py test accounts.tests`

When `DEV_ENV=True`, CORS / SSL / throttles are relaxed so browser, emulator, and LAN clients are not blocked. Set `DEV_ENV=False` before Contabo production.

## Docker Compose (Contabo / local parity)

```
cd infra
cp .env.example .env   # fill secrets; DEV_ENV=False in prod
chmod +x scripts/*.sh
docker compose up -d --build
./scripts/backup-volumes.sh
```

8 GB memory budgets: see `docs/service_separation_plan.md` §7.8.

## Capacitor (Android)

```bash
cd apps/web
# API + Next running; for emulator use NEXT_PUBLIC_API_URL=http://10.0.2.2:8000
npm run cap:sync
npm run cap:android
```



## USSD live cutover (later)

Homepage simulator + `POST /api/v1/ussd/simulate/` share the same menu engine as  
`POST /api/v1/ussd/` (Africa's Talking plain-text `CON`/`END`). When Twilio / AT / TextSMS credentials arrive, set `USSD_PROVIDER` + API key env vars and point the provider webhook at `/api/v1/ussd/`.
