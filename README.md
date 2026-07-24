# AgriScan monorepo

Next.js frontend (Vercel) + Django API / workers (Contabo Docker).

```
agriscan/
├── apps/
│   ├── api/          # Django 5 + DRF + Celery task code
│   └── web/          # Next.js (Phase 2)
├── infra/            # Compose, nginx, deploy/backup scripts
├── docs/
│   └── service_separation_plan.md
└── packages/         # shared-types (optional)
```

## Quick start (API locally)

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-api.txt   # slim; or requirements.txt for full ML
python manage.py migrate
python manage.py runserver
```

Health: `GET /api/v1/health/`  
JWT login: `POST /api/v1/auth/login/`  
Scans: `POST /api/v1/scans/` (async Celery job)

## Docker Compose (Contabo / local parity)

```bash
cd infra
cp .env.example .env   # fill secrets
chmod +x scripts/*.sh
docker compose up -d --build
```

8 GB memory budgets: see `docs/service_separation_plan.md` §7.8.

## Workers

| Container | Queue | Image |
|-----------|-------|-------|
| `api` | — | `Dockerfile.api` (no TF) |
| `worker_scanner` | `scan` | `Dockerfile.worker` `WORKER_KIND=scanner` |
| `worker_rag` | `rag` | `Dockerfile.worker` `WORKER_KIND=rag` |
