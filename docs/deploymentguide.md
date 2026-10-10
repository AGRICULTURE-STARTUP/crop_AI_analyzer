# AgriScan Deployment Guide

**Target:** Contabo Cloud VPS (~$5–6 / Cloud VPS 4 · **4 vCPU · 8 GB RAM**) + Vercel (Next.js)  
**Stack:** Docker Compose API / workers on Contabo · frontend on Vercel · Cloudinary for media  
**Last updated:** 10 October 2026

This guide assumes **Contabo** is your production API host. Compose (`infra/docker-compose.yml`) is already tuned for Contabo’s 8 GB plan.

---

## 0. Start afresh on a new server (read this first)

Use this section when you have a **brand-new VPS** (empty Ubuntu install, new IP, no previous AgriScan containers). Do not try to reuse an old server’s Docker volumes unless you are deliberately migrating data (§0.3).

### 0.1 What you need before SSH

| Item | Why |
| ---- | --- |
| Contabo (or equivalent) **Cloud VPS 4**: Ubuntu 24.04, **4 vCPU / 8 GB RAM**, ≥75 GB disk | Scanner worker needs ~2.5 GB; 4 GB plans will OOM |
| Public **IPv4** + root password or SSH key from the panel | First login |
| GitHub repo URL for this monorepo (HTTPS or SSH) | Clone onto the VPS |
| **Cloudinary** `CLOUDINARY_URL` | Production media |
| **Groq** API key | AgriBot / scan narratives |
| **Hugging Face** access for crop models (`HF_MODEL_REPO_ID=jobcode12/CropModels`; private repos need `HF_TOKEN`) | `deploy.sh` runs `sync_models` |
| Laptop SSH key | Optional root login + optional GitHub Actions |

Domain is **optional** on day one. You can go live on `http://NEW_SERVER_IP` and attach `api.yourdomain.com` later.

### 0.2 Fresh-server checklist (end-to-end)

Work through these in order. Details for each step are in §3–§5 and §7.

1. **Order / power on** the new VPS (Ubuntu 24.04, 8 GB). Note the new IP.
2. **SSH as root** (this guide stays on root — no extra Linux user). Optionally add your SSH key under `/root/.ssh/authorized_keys` (§4 Step 1).
3. **Install Docker + Compose** as root (§4 Step 2).
4. **Firewall:** allow 22, 80, 443 only — never expose 5432/6379 (§4 Step 3).
5. **Clone** the repo to `/opt/agriscan` as root (§4 Step 5).
6. **Create `infra/.env`** from `.env.example` with `DEV_ENV=False`, `DEBUG=False`, new `SECRET_KEY`, new Postgres password, Contabo IP in `ALLOWED_HOSTS` / CSRF, Cloudinary, Groq, and HF settings (§4 Step 6).
7. **First deploy:**
   ```bash
   cd /opt/agriscan/infra
   chmod +x scripts/*.sh
   ./scripts/deploy.sh
   ```
   This builds images, migrates the DB, collectstatic, **downloads crop models from Hugging Face into the `models_data` volume**, and starts all services. First run can take a long time (image build + model download).
8. **Create superuser:** `docker compose -f docker-compose.yml exec api python manage.py createsuperuser`
9. **Smoke test:** `curl -s http://NEW_SERVER_IP/api/v1/health/` → expect postgres/redis OK and `"dev_env": false`.
10. **Point Vercel** `NEXT_PUBLIC_API_URL` at `http://NEW_SERVER_IP` (or HTTPS API URL if you already have TLS), update CORS/CSRF in `infra/.env`, restart `api` (§5).
11. **Verify** login, scan, AgriBot, Cloudinary upload (§7).
12. **Optional later:** DNS + Let’s Encrypt (§4 Step 10), backups + Contabo snapshots (§4 Step 12), GitHub Actions SSH deploy (§10).

### 0.3 New server vs migrating an old one


| Situation | What to do |
| --------- | ---------- |
| **Brand-new empty VPS** (your case) | Follow §0.2. Fresh Postgres volume = empty DB. Recreate superuser and any seed data. |
| **Replace old Contabo, keep data** | On the **old** server: `./scripts/backup-volumes.sh`. Copy `infra/backups/pg_*.sql` (and note Cloudinary is already off-box). On the **new** server: complete §0.2 through first deploy, then restore with `./scripts/restore-volumes.sh` (see that script’s usage). Update DNS / Vercel / GitHub `CONTABO_HOST` to the **new IP**. |
| **Old server still running** | Leave it up until the new health check and Vercel cutover succeed, then stop the old stack and cancel the old VPS. |


**After cutover, update everywhere the old IP appeared:** Vercel `NEXT_PUBLIC_API_URL`, Contabo `.env` CORS/CSRF/ALLOWED_HOSTS, Google OAuth redirect URIs, M-Pesa callback URL, GitHub Actions `CONTABO_HOST`, and any DNS A records.

### 0.4 Do not do these on a fresh server

- Do **not** copy `docker-compose.override.yml` into the production run path (it publishes DB/Redis and uses `runserver`). Always: `docker compose -f docker-compose.yml …`.
- Do **not** set `DEV_ENV=True` or `DEBUG=True` on Contabo.
- Do **not** skip `HF_MODEL_REPO_ID` / model sync — an empty `/models` volume means scans never finish.
- Do **not** expose Postgres or Redis ports on the public firewall.

---

## 1. Current status (what you already have)


| Layer             | Status           | Notes                                                                                         |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| **Monorepo**      | Ready            | `apps/api` (Django), `apps/web` (Next.js), `infra/` (Compose + nginx + scripts)               |
| **Compose stack** | Ready            | Postgres, Redis, API, scanner worker, RAG worker, nginx, certbot — tuned for Contabo **8 GB** |
| **Deploy script** | Ready            | `infra/scripts/deploy.sh` (build → migrate → collectstatic → **sync_models** → up)            |
| **Crop models**   | HF sync          | `manage.py sync_models` pulls `HF_MODEL_REPO_ID` into the `models_data` volume on deploy      |
| **Backups**       | Ready            | `infra/scripts/backup-volumes.sh` + `restore-volumes.sh` + Contabo panel snapshots            |
| **Frontend**      | Vercel-ready     | Set `NEXT_PUBLIC_API_URL` to Contabo IP or `https://api.yourdomain.com`                       |
| **CI/CD Contabo** | Optional         | Add `.github/workflows/deploy-contabo.yml` after first manual deploy (§10); or SSH + `deploy.sh` |
| **CI/CD Vercel**  | Platform-native  | Connect GitHub repo; auto-deploys `apps/web` on push                                          |
| **Custom domain** | Optional day-one | Not required; use Contabo IP + `*.vercel.app` until HTTPS / pilot                             |
| **Media**         | Code-ready       | Cloudinary when `CLOUDINARY_URL` is set; else ephemeral `media_tmp` volume                    |
| **KAMIS prices**  | Partial          | File in image/repo, or cron ingest on Contabo                                                 |
| **TLS**           | Manual           | HTTP on Contabo IP first; HTTPS after domain + Let’s Encrypt                                  |


**Verdict:** On a **new server**, follow **§0** then **§4**. Deploy on **Contabo Cloud VPS 4** (Ubuntu 24.04, 8 GB). Keep the UI on **Vercel**. Use Cloudinary for uploads. Domain can wait until you want HTTPS / public pilot.

### Memory budget (matches `infra/docker-compose.yml`)


| Service          | Limit   | Role                              |
| ---------------- | ------- | --------------------------------- |
| `api`            | 1 GB    | Gunicorn + Django                 |
| `worker_scanner` | 2.5 GB  | TensorFlow crop models (heaviest) |
| `worker_rag`     | 1.75 GB | Embeddings / Chroma               |
| `postgres`       | 1 GB    | Primary DB                        |
| `redis`          | 256 MB  | Cache + Celery broker             |
| `nginx`          | 128 MB  | Reverse proxy                     |
| **Total capped** | ~6.6 GB | Leaves headroom for OS + Docker   |


---



## 2. Target architecture

```
Users / Capacitor app
        │
        ▼
┌───────────────────┐         HTTPS          ┌────────────────────────────┐
│  Vercel (Next.js) │ ─────────────────────► │ Contabo VPS (Docker)       │
│  apps/web         │   NEXT_PUBLIC_API_URL  │  nginx → api:8000          │
└───────────────────┘                        │  Celery: scan + rag        │
                                             │  Postgres + Redis (local)  │
                                             └─────────────┬──────────────┘
                                                           │
                    ┌──────────────────────────────────────┼──────────────────┐
                    ▼                                      ▼                  ▼
              Cloudinary                          Groq / Tavily /       SendGrid
           (profile + scan images)                OpenWeather / HF      (email)
```


| Piece                  | Where it runs                       | Why                                                 |
| ---------------------- | ----------------------------------- | --------------------------------------------------- |
| Next.js UI             | **Vercel**                          | Free/cheap CDN, HTTPS, easy deploys                 |
| Django API + Celery    | **Contabo Docker**                  | Needs RAM for TF models; long-running workers       |
| Postgres               | **Contabo container**               | Included in Compose; keep data on the VPS           |
| Redis                  | **Contabo container** (recommended) | Low latency for Celery; Upstash optional (see §6)   |
| Images                 | **Cloudinary**                      | Durable media; Contabo volumes alone are not enough |
| LLM / search / weather | **External APIs**                   | Groq, Tavily, OpenWeather via env keys              |


---



## 3. Before you order Contabo (checklist)



### Contabo plan to buy


| Setting | Choose                                                                        |
| ------- | ----------------------------------------------------------------------------- |
| Plan    | **Cloud VPS 4** (or equivalent ~**4 vCPU / 8 GB RAM**) — ~€5–6 / ~$5–6        |
| OS      | **Ubuntu 24.04 LTS**                                                          |
| Disk    | ≥75–100 GB SSD or **NVMe** if free upgrade                                    |
| Region  | Contabo default (EU) is fine for day one                                      |
| Access  | Add your **SSH public key** in the panel if offered; note the **public IPv4** |


Compose memory limits assume this 8 GB box. Do not buy a 4 GB plan — the scanner worker alone can use ~2.5 GB.

### If Contabo payment declines

Retry with another card, PayPal (if offered), monthly term first, or Contabo support. If it still fails, the same §4 steps work on Hetzner / Hostinger (8 GB Ubuntu) — only the provider panel changes. Prefer sticking with Contabo when payment clears.

### Do you need a domain *right now*?

**No.** Deploy on the Contabo **public IP** + Vercel `*.vercel.app` first.


| Phase                             | Domain needed? | What to use                                      |
| --------------------------------- | -------------- | ------------------------------------------------ |
| **First Contabo + Vercel**        | Optional       | `http://CONTABO_IP/...` + `https://….vercel.app` |
| **HTTPS (Let’s Encrypt)**         | Yes            | `api.yourdomain.com` → Contabo IP                |
| **Public pilot / M-Pesa / OAuth** | Strongly yes   | Stable HTTPS URLs                                |


Stay on HTTP only for private testing. Do not point farmers or M-Pesa at a bare IP over HTTP.

### Checklist

1. Order Contabo Cloud VPS 4 (Ubuntu 24.04, 8 GB) — domain can wait. Note the **new** IP.
2. Create accounts (free tiers OK):
  - [Cloudinary](https://cloudinary.com) — image uploads (**required** for prod media)
  - [Groq](https://console.groq.com) — AgriBot + scan reports
  - [Hugging Face](https://huggingface.co) — token if `jobcode12/CropModels` (or your fork) is private
  - [SendGrid](https://sendgrid.com) — email (optional)
  - Google Cloud Console — OAuth (if using Google login)
3. SSH key on your laptop (`ssh-keygen -t ed25519` if needed).
4. Note Contabo IP + root credentials from the control panel.
5. Then follow **§0.2** (fresh-server checklist) / **§4**.

You do **not** need managed Redis or Postgres on day one — Compose runs both on Contabo.

---



## 4. Step-by-step: Contabo VPS setup (new server)

Once Contabo email/panel gives you the **new** IP, follow these steps on the server. This is the detailed version of §0.2.

### Step 1 — Provision and first login

Stay on **root** for the whole Contabo setup (no extra Linux user).

1. In Contabo Customer Control Panel, confirm the instance is **running**. Copy the **public IPv4** and root password (or use the SSH key you added at order).
2. From your laptop:

```bash
ssh root@YOUR_CONTABO_IP
```

3. Optional — add your laptop SSH public key so you are not stuck with the panel password:

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
# On your laptop: cat ~/.ssh/id_ed25519.pub
# Paste that line into authorized_keys on the VPS:
nano /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Confirm key login from a second terminal: `ssh root@YOUR_CONTABO_IP`

4. Optional: after key auth works, disable password SSH (`PasswordAuthentication no` in `/etc/ssh/sshd_config`, then `systemctl reload ssh`).

### Step 2 — System packages + Docker

All commands below are as **root** (no `sudo` needed):

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git ufw fail2ban

# Docker Engine + Compose plugin (official install)
curl -fsSL https://get.docker.com | sh
```

Verify:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

### Step 3 — Firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

**Do not** expose Postgres `5432` or Redis `6379` to the public internet. Compose keeps them on the internal Docker network. Production uses `infra/docker-compose.yml` only (the override file that publishes those ports is for local laptop parity).

### Step 4 — DNS (skip until you buy a domain)

**No domain yet?** Skip this step. Reach the API at `http://YOUR_CONTABO_IP/` (nginx on port 80). In `.env` (Step 6) set:

```bash
ALLOWED_HOSTS=YOUR_CONTABO_IP,localhost
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,http://YOUR_CONTABO_IP
```

Browsers may warn on mixed content if the Vercel site is HTTPS and the Contabo API is HTTP — OK for private testing; for public launch, buy a domain and finish Step 10.

**When you have a domain**, point DNS at Contabo:

| Type | Name  | Value             |
| ---- | ----- | ----------------- |
| A    | `api` | `YOUR_CONTABO_IP` |

Wait until `dig +short api.yourdomain.com` returns the Contabo IP before enabling HTTPS.

### Step 5 — Clone the repo on the VPS

```bash
mkdir -p /opt/agriscan
cd /opt/agriscan
git clone https://github.com/YOUR_ORG/crop_AI_analyzer.git .
# Private repo: use a GitHub deploy key (read-only) or HTTPS + PAT
```

Confirm you are on the branch you want to deploy (`main` unless you intentionally use another):

```bash
git status
git log -1 --oneline
```

### Step 6 — Production env file

```bash
cd /opt/agriscan/infra
cp .env.example .env
chmod 600 .env
nano .env   # or vim
```

Generate secrets on the VPS or laptop:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # SECRET_KEY
openssl rand -base64 32                                         # POSTGRES_PASSWORD
```

**Minimum production values for a new server (no domain yet):**

```bash
# --- Postgres ---
POSTGRES_USER=agriscan
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=agriscan

# --- Django ---
SECRET_KEY=<django-secret-key>
DEBUG=False
DEV_ENV=False                           # CRITICAL — never True on Contabo

# Day-one: Contabo public IP (replace 91.x.x.x)
ALLOWED_HOSTS=91.x.x.x,localhost
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,http://91.x.x.x

# After domain + TLS, switch to:
# ALLOWED_HOSTS=api.yourdomain.com
# CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com
# CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com,https://api.yourdomain.com

# Redis/Celery — keep Compose service names:
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Inference knobs (Contabo 8 GB)
MAX_LOADED_CROP_MODELS=2
RERANKER_ENABLED=false
MODELS_DIR=/models
GUNICORN_WORKERS=2
MAX_QUEUED_SCAN_JOBS=20

# --- Crop models (required — deploy.sh calls sync_models) ---
HF_MODEL_REPO_ID=jobcode12/CropModels
HF_MODEL_REVISION=main
HF_TOKEN=                               # required if the HF repo is private

# --- Must-have externals ---
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
GROQ_API_KEY=...
# optional but recommended:
SENDGRID_API_KEY=...
EMAIL_HOST_USER=apikey
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
TAVILY_API_KEY=...
OPEN_WEATHER_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# --- M-Pesa (when going live) ---
# Django code currently reads CONSUMER_KEY / CONSUMER_SECRET (see mpesa_utils).
# .env.example uses MPESA_CONSUMER_* — set BOTH naming styles until the code is unified.
CONSUMER_KEY=...
CONSUMER_SECRET=...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://api.yourdomain.com/mpesa/callback/
MPESA_ENV=sandbox
```

Also set a strong `ADMIN_PASSWORD` if you use the custom admin bootstrap path (code has a default — change it).

### Step 7 — First deploy (builds stack + syncs models)

On Contabo, always use the production compose file (do **not** rely on `docker-compose.override.yml`):

```bash
cd /opt/agriscan/infra
chmod +x scripts/*.sh
./scripts/deploy.sh
```

What `deploy.sh` does:

1. `docker compose -f docker-compose.yml build`
2. `migrate --noinput` and `collectstatic --noinput`
3. **`python manage.py sync_models`** — downloads crop models from Hugging Face into the `models_data` volume (`/models`)
4. `up -d` and prints `ps`

**First run is slow** (Docker image build + model download). Watch progress:

```bash
docker compose -f docker-compose.yml logs -f api worker_scanner worker_rag
```

If model sync fails (missing `HF_MODEL_REPO_ID`, bad `HF_TOKEN`, or network):

```bash
cd /opt/agriscan/infra
docker compose -f docker-compose.yml run --rm \
  -e HF_HUB_OFFLINE=0 \
  worker_scanner python manage.py sync_models
docker compose -f docker-compose.yml exec worker_scanner ls -la /models
```

Without models in `/models`, scan jobs stay queued or fail.

**Manual equivalent** (if you prefer not to use the script):

```bash
COMPOSE="docker compose -f docker-compose.yml"
$COMPOSE build
$COMPOSE run --rm api python manage.py migrate --noinput
$COMPOSE run --rm api python manage.py collectstatic --noinput
$COMPOSE run --rm -e HF_HUB_OFFLINE=0 worker_scanner python manage.py sync_models
$COMPOSE up -d
$COMPOSE ps
```

### Step 8 — Create Django superuser

A fresh Postgres volume has **no users**. Create one:

```bash
cd /opt/agriscan/infra
docker compose -f docker-compose.yml exec api python manage.py createsuperuser
```

### Step 9 — Smoke test on the new IP

```bash
curl -s http://YOUR_CONTABO_IP/api/v1/health/
docker compose -f docker-compose.yml ps
docker stats --no-stream
```

Expect healthy postgres/redis, `"dev_env": false`, and all services `Up`. Then continue to §5 (Vercel) and §7 (full verification).

### Step 10 — HTTPS (Let’s Encrypt) — requires a domain

Skip until DNS for `api.yourdomain.com` points at Contabo. Until then, verify with:

```bash
curl -I http://YOUR_CONTABO_IP/api/v1/health/
```

When the domain is ready:

1. Confirm HTTP works: `curl -I http://api.yourdomain.com/api/v1/health/`
2. Issue cert:

```bash
docker compose -f docker-compose.yml --profile certs run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d api.yourdomain.com \
  --email you@yourdomain.com --agree-tos --no-eff-email
```

3. Edit `infra/nginx/conf.d/api.conf`: set `server_name`, uncomment the `listen 443 ssl` block, point cert paths at `/etc/letsencrypt/live/api.yourdomain.com/`.
4. Reload nginx:

```bash
docker compose -f docker-compose.yml up -d --build nginx
```

5. Add a renew cron on the host (example monthly):

```bash
# crontab -e as root
0 3 1 * * cd /opt/agriscan/infra && docker compose -f docker-compose.yml --profile certs run --rm certbot renew && docker compose -f docker-compose.yml exec nginx nginx -s reload
```

### Step 11 — KAMIS price DB on the VPS

The market API reads offline SQLite (`apps/api/data/kamis_prices.db`). Options:

**A (simple):** Ensure the file is in the image/repo when you build. Redeploy periodically so Contabo picks up fresh data.

**B (better):** Cron on Contabo:

```bash
# crontab -e
0 */6 * * * cd /opt/agriscan/infra && docker compose -f docker-compose.yml exec -T api python manage.py ingest_kamis_prices >> /var/log/kamis-ingest.log 2>&1
```

(May need a writable mount for `data/` if the image filesystem is read-only — if ingest fails, bind-mount `../apps/api/data` into the api service.)

### Step 12 — Backups

```bash
cd /opt/agriscan/infra
./scripts/backup-volumes.sh
# copies to infra/backups/pg_*.sql
```

Schedule weekly + enable **Contabo snapshots** in the control panel. Offsite: `scp` SQL dumps to your laptop or object storage. To restore onto this or another new server, use `./scripts/restore-volumes.sh` after Compose is up (read the script comments before running).

---



## 5. Step-by-step: Vercel (frontend)

This is also your **frontend CI/CD**: once the project is linked to GitHub, every push that affects `apps/web` redeploys automatically. Contabo API deploys are separate (§10).

1. Push the monorepo to GitHub (if not already).
2. [Vercel](https://vercel.com) → New Project → import the repo.
3. **Root Directory:** `apps/web`
4. Framework: Next.js (auto-detected)
5. Environment variable:


| Phase                  | `NEXT_PUBLIC_API_URL`        |
| ---------------------- | ---------------------------- |
| **No domain yet**      | `http://YOUR_CONTABO_IP`     |
| **Domain + TLS ready** | `https://api.yourdomain.com` |


1. Deploy. Note the URL (`https://agriscan-xxx.vercel.app`) — no custom domain required on Vercel day one.
2. Update Contabo `infra/.env`:
  - `CORS_ALLOWED_ORIGINS` must include the Vercel URL (and custom domain if any)
  - `CSRF_TRUSTED_ORIGINS` same
  - `ALLOWED_HOSTS` must include the Contabo IP or `api.yourdomain.com`
3. Restart API so CORS reloads:

```bash
cd /opt/agriscan/infra
docker compose up -d api
```

1. Later: attach a custom domain in Vercel and add it to CORS/CSRF lists.

Auth uses JWT in `localStorage` (`Authorization: Bearer …`), so cross-origin Vercel → Contabo works without cookie sharing. CORS must still allow the Vercel origin.

---



## 6. Making the system work effectively (managed services)



### 6.1 Cloudinary — **required for production media**

**Why:** Profile photos, agency product images, and scan job images. Without Cloudinary, Compose uses volume `media_tmp`, which is easy to lose on rebuild and is not backed up by `backup-volumes.sh`.

**How:**

1. Cloudinary dashboard → copy `CLOUDINARY_URL` (`cloudinary://KEY:SECRET@CLOUD_NAME`).
2. Put it in `infra/.env`.
3. Redeploy API + scanner (both share media for scan images):

```bash
docker compose up -d api worker_scanner
```

Django already switches to `MediaCloudinaryStorage` when `CLOUDINARY_URL` is set (`AgriProject/settings.py`).

**Check:** Upload a farmer/buyer profile photo from the Vercel UI; confirm the returned URL is `res.cloudinary.com/...`.

### 6.2 Redis — stay on Contabo (Upstash only if needed)


| Option                         | When to use                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Redis in Compose** (default) | Recommended. Zero extra cost, low latency for Celery on the same host, already in memory budget (256 MB). |
| **Upstash Redis**              | Only if you outgrow the VPS, need multi-region, or run API elsewhere without a local Redis.               |


If you ever switch to Upstash:

1. Create Upstash Redis DB → copy Redis URL (`rediss://…`).
2. Set in `infra/.env`:

```bash
REDIS_URL=rediss://default:PASSWORD@xxx.upstash.io:6379
CELERY_BROKER_URL=rediss://default:PASSWORD@xxx.upstash.io:6379
CELERY_RESULT_BACKEND=rediss://default:PASSWORD@xxx.upstash.io:6379
```

1. You can stop/remove the local `redis` service — but you must also remove `depends_on: redis` healthchecks or Compose will wait forever. Prefer keeping local Redis until that refactor is deliberate.

**Do not** set `USE_LOCMEM_CACHE=True` or `DEV_ENV=True` on Contabo — Celery and caching will misbehave under load.

### 6.3 Postgres — stay on Contabo

Managed Postgres (Neon, Supabase, Contabo DB) is optional later. Day-one Compose Postgres + volume `pgdata` + `backup-volumes.sh` is enough. If you move to managed Postgres later, set `DATABASE_URL` and `DB_SSL_REQUIRE=true` and drop the local `postgres` service.

### 6.4 SendGrid (email)

Needed for password reset / notifications if you enable them. Set `SENDGRID_API_KEY`, `EMAIL_HOST_USER=apikey`, `DEFAULT_FROM_EMAIL`. Verify the sender domain in SendGrid.

### 6.5 Groq / Tavily / OpenWeather / Hugging Face


| Key                    | Feature                                        |
| ---------------------- | ---------------------------------------------- |
| `GROQ_API_KEY`         | AgriBot chat, scan report narrative, USSD tips |
| `TAVILY_API_KEY`       | Web search for AgriBot                         |
| `OPEN_WEATHER_API_KEY` | Weather widgets                                |
| `HF_MODEL_REPO_ID`     | Crop model repo for `sync_models` (required on deploy) |
| `HF_TOKEN`             | Hugging Face token if the model repo is private        |


Without Groq, chat/report quality drops; scans can still classify via local TF **if** `/models` was filled by `sync_models`.

### 6.6 Google OAuth

Add production redirect URIs in Google Cloud Console for your Contabo/Vercel URLs. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `infra/.env`.

### 6.7 M-Pesa

Code expects `CONSUMER_KEY` and `CONSUMER_SECRET` (see `mpesa_utils`). The `.env.example` names `MPESA_CONSUMER_*` are **not** read by Django today — set both naming styles or fix the code before go-live. Callback URL must hit `https://api.yourdomain.com/...` over HTTPS.

### 6.8 USSD

Keep `USSD_PROVIDER=simulate` until Africa’s Talking / Twilio / TextSMS credentials exist. Then set provider keys and point the webhook at `POST https://api.yourdomain.com/api/v1/ussd/`.

---



## 7. Post-deploy verification

Run through this on a real phone/browser after Contabo + Vercel are live. Use `http://YOUR_CONTABO_IP` until you have TLS.


| #   | Check                                                            | Expected                                                              |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | `GET http://YOUR_CONTABO_IP/api/v1/health/` (or `https://api.…`) | JSON: postgres + redis OK, `"dev_env": false`                         |
| 2   | Open Vercel site → Login / Signup                                | JWT issued; no CORS errors in DevTools                                |
| 3   | Farmer profile photo upload                                      | Cloudinary URL stored                                                 |
| 4   | Crop scan                                                        | Job leaves `queued` → `completed`; scanner worker logs show inference |
| 5   | AgriBot chat                                                     | Groq response returns                                                 |
| 6   | Market / KAMIS prices                                            | Non-empty prices from SQLite                                          |
| 7   | `docker stats` on Contabo                                        | No thrashing near 8 GB; scanner < 2.5 GB                              |
| 8   | Backup                                                           | `./scripts/backup-volumes.sh` produces SQL dump                       |
| 9   | Push a small API change to `main` (if §10 workflow is installed) | GitHub Action **Deploy Contabo** succeeds; health still OK            |
| 10  | Push a web-only change                                           | Vercel redeploys; Contabo does not need a rebuild                     |


Local QA before Contabo: follow `[LOCAL_TESTING.md](./LOCAL_TESTING.md)` with `DEV_ENV=True`, then flip to production flags as above.

---



## 8. Day-2 operations



### Update / redeploy

**Preferred:** push to `main` and let §10 CI/CD update Contabo (API/infra) and Vercel (web).

**Manual fallback** (SSH):

```bash
cd /opt/agriscan
git pull
cd infra
./scripts/deploy.sh
```



### Logs

```bash
docker compose logs -f api worker_scanner worker_rag nginx
```



### Restart one service

```bash
docker compose restart api
```



### Disk pressure

TF models + Docker images + Postgres grow. Monitor:

```bash
df -h
docker system df
# careful prune (does not delete named volumes):
docker system prune -f
```



### Scaling later

If OOM or slow scans become common:

1. Contabo upgrade to **12 GB** plan, or
2. Lower `MAX_LOADED_CROP_MODELS` to `1`, or
3. Run scanner worker on a second VPS (advanced).

---



## 9. Known gaps / fix before or right after go-live

1. `DEV_ENV=False` **and** `DEBUG=False` — non-negotiable on Contabo.
2. **Cloudinary** — do not rely on `media_tmp` alone.
3. **M-Pesa env name mismatch** — set `CONSUMER_KEY` / `CONSUMER_SECRET`.
4. **Domain / TLS** — optional for private IP testing; required before public pilot, OAuth production redirects, and M-Pesa callbacks. Uncomment nginx SSL after certbot.
5. **Models volume** — empty `/models` → scans never finish. On a new server, `deploy.sh` must complete `sync_models` successfully (`HF_MODEL_REPO_ID` + `HF_TOKEN` if private).
6. **KAMIS** — refresh SQLite on VPS (cron or redeploy).
7. **CI/CD secrets** — if you use GitHub Actions, `CONTABO_HOST` / `CONTABO_USER` / `CONTABO_SSH_KEY` must point at the **new** IP.
8. **Change default** `ADMIN_PASSWORD` if used.
9. **Do not commit** real `.env` or OAuth client secret JSON under `docs/`.
10. **Compose override** — never use `docker-compose.override.yml` on Contabo (it publishes DB/Redis ports and uses `runserver`). Prefer:

```bash
docker compose -f docker-compose.yml up -d --build
```

---



## 10. CI/CD — push to GitHub → update Contabo (+ Vercel)

**Not required for the first successful deploy on a new server.** Finish §0 / §4 / §5 / §7 first, then add automation.

You want two pipelines, not one:

| Change                      | Who deploys | How                                                               |
| --------------------------- | ----------- | ----------------------------------------------------------------- |
| `apps/web/**`               | **Vercel**  | Auto on every push (connect the GitHub repo; root dir `apps/web`) |
| `apps/api/**` or `infra/**` | **Contabo** | GitHub Action SSHs in and runs `infra/scripts/deploy.sh`          |

If `.github/workflows/deploy-contabo.yml` is not in the repo yet, create it (or keep deploying manually with `git pull` + `./scripts/deploy.sh` on the VPS). The steps below assume that workflow exists or that you add it.

### 10.1 One-time: SSH deploy key on the **new** VPS

On your **laptop**:

```bash
ssh-keygen -t ed25519 -C "github-actions-contabo" -f ~/.ssh/agriscan_deploy -N ""
```

On the **VPS** (as `root`):

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> /root/.ssh/authorized_keys   # contents of agriscan_deploy.pub
chmod 600 /root/.ssh/authorized_keys
```

Confirm the clone at `/opt/agriscan` can `git pull` (deploy key or HTTPS with a PAT if the repo is private). Prefer a **read-only GitHub deploy key** on the VPS for `git fetch`, separate from the Actions SSH key that logs into the machine.

If the repo is private, on the VPS:

```bash
# Option A: HTTPS + fine-grained PAT stored in git credential helper
# Option B: GitHub deploy key (read-only) added to the repo
cd /opt/agriscan && git remote -v
```



### 10.2 GitHub secrets

Repo → **Settings → Secrets and variables → Actions** → add:


| Secret             | Example                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `CONTABO_HOST`     | `91.x.x.x` or `api.yourdomain.com`                                                |
| `CONTABO_USER`     | `root`                                                                            |
| `CONTABO_SSH_KEY`  | Full private key (`-----BEGIN OPENSSH PRIVATE KEY-----` …) from `agriscan_deploy` |
| `CONTABO_SSH_PORT` | `22` (optional)                                                                   |
| `CONTABO_APP_DIR`  | `/opt/agriscan` (optional)                                                        |




### 10.3 What the workflow does on each push to `main`

1. SSH into Contabo
2. `git fetch` + `git reset --hard origin/main`
3. `cd infra && ./scripts/deploy.sh` (build images, migrate, collectstatic, restart containers)

It only runs when `apps/api/**`, `infra/**`, or the workflow file itself change (so frontend-only pushes don’t rebuild Contabo).

### 10.4 Vercel side (frontend CI/CD)

1. Vercel → Import GitHub repo → root `apps/web`
2. Set `NEXT_PUBLIC_API_URL`
3. Every push that touches the web app auto-deploys — no Contabo step needed

Update Contabo `CORS_ALLOWED_ORIGINS` if the Vercel URL changes.

### 10.5 First manual deploy still required

CI/CD assumes the **new** Contabo already has Docker, `/opt/agriscan` cloned, `infra/.env` filled, and a successful first `./scripts/deploy.sh` (including `sync_models`). Actions only **update** that install. When you change servers, update `CONTABO_HOST` (and the deploy SSH key if the old key lived only on the previous VPS).

### 10.6 Safety tips

- Protect `main` with a required PR review if others push.  
- Never put `infra/.env` secrets in GitHub Actions — they stay on Contabo.  
- Watch Actions logs + `docker compose logs` after the first auto-deploy.  
- Manual fallback: SSH into Contabo and run `./scripts/deploy.sh`.

---



## 11. Suggested Contabo go-live order (new server)

1. Order **Contabo Cloud VPS 4** (Ubuntu 24.04, 8 GB). **Domain can wait.** Note the **new** IP.
2. Create / confirm Cloudinary + Groq (+ Hugging Face token if the model repo is private).
3. Follow **§0.2** / **§4** on the new server: Docker → `infra/.env` with the new IP → `./scripts/deploy.sh` (models sync automatically) → superuser → health check.
4. Point Vercel `NEXT_PUBLIC_API_URL` at `http://NEW_SERVER_IP` (or keep an existing Vercel project and only change this env var + redeploy).
5. Align CORS/CSRF/ALLOWED_HOSTS on Contabo to the Vercel URL; restart `api`.
6. Run §7 verification (login, scan, AgriBot, Cloudinary).
7. If you had an old server: update DNS, OAuth, M-Pesa callbacks, and GitHub `CONTABO_HOST` to the new IP; then decommission the old VPS.
8. Optional: add §10 CI/CD after the first manual deploy works.
9. Later: buy domain → DNS A record → certbot (§4 Step 10) → switch Vercel to `https://api.…`.
10. Schedule Contabo snapshots + `backup-volumes.sh` + KAMIS cron.

**End state:** Vercel (UI) · Contabo Docker (API / Celery / Postgres / Redis) · Cloudinary (images) · crop models in the `models_data` volume via Hugging Face `sync_models`.