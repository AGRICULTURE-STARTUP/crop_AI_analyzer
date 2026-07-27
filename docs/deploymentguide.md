# AgriScan Deployment Guide

**Target:** Contabo Cloud VPS (~$5 / Cloud VPS 4 · 4 vCPU · 8 GB RAM) + Vercel (Next.js)  
**Stack:** Docker Compose API / workers on Contabo · frontend on Vercel · managed add-ons for media & email  
**Last updated:** 27 July 2026

---

## 1. Current status (what you already have)

| Layer | Status | Notes |
|-------|--------|--------|
| **Monorepo** | Ready | `apps/api` (Django), `apps/web` (Next.js), `infra/` (Compose + nginx + scripts) |
| **Compose stack** | Ready | Postgres, Redis, API, scanner worker, RAG worker, nginx, certbot profile — tuned for **8 GB** |
| **Deploy script** | Ready | `infra/scripts/deploy.sh` (build → migrate → collectstatic → up) |
| **Backups** | Ready | `infra/scripts/backup-volumes.sh` (Postgres dump) |
| **Frontend** | Vercel-ready | Set `NEXT_PUBLIC_API_URL` to Contabo IP or `https://api.yourdomain.com` |
| **CI/CD Contabo** | Workflow ready | `.github/workflows/deploy-contabo.yml` — SSH + `deploy.sh` on push to `main` (needs secrets) |
| **CI/CD Vercel** | Platform-native | Connect GitHub repo; auto-deploys `apps/web` on push |
| **Custom domain** | Optional day-one | Not required to buy Contabo; use VPS IP + `*.vercel.app` until HTTPS / pilot |
| **Media** | Code-ready | Uses Cloudinary when `CLOUDINARY_URL` is set; otherwise ephemeral Docker volume |
| **KAMIS prices** | Partial | GitHub Action refreshes `kamis_prices.db` in git every 3h; VPS needs that file present (pull or cron) |
| **TLS** | Manual | HTTP nginx works on IP; HTTPS needs a domain + Let’s Encrypt (certbot profile) |
| **Formal runbook** | This doc | Replaces the missing `deploy_runbook.md` |

**Verdict:** Buy Contabo tomorrow and deploy **without** a custom domain if you want. Use the public IP + Vercel free URL first; add DNS + TLS when you are ready for public/pilot traffic. Do **not** skip Cloudinary and production env hardening — those are what make the system reliable, not “nice to have.”

### Memory budget (matches `infra/docker-compose.yml`)

| Service | Limit | Role |
|---------|-------|------|
| `api` | 1 GB | Gunicorn + Django |
| `worker_scanner` | 2.5 GB | TensorFlow crop models (heaviest) |
| `worker_rag` | 1.75 GB | Embeddings / Chroma |
| `postgres` | 1 GB | Primary DB |
| `redis` | 256 MB | Cache + Celery broker |
| `nginx` | 128 MB | Reverse proxy |
| **Total capped** | ~6.6 GB | Leaves headroom for OS + Docker |

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

| Piece | Where it runs | Why |
|-------|---------------|-----|
| Next.js UI | **Vercel** | Free/cheap CDN, HTTPS, easy deploys |
| Django API + Celery | **Contabo Docker** | Needs RAM for TF models; long-running workers |
| Postgres | **Contabo container** | Included in Compose; keep data on the VPS |
| Redis | **Contabo container** (recommended) | Low latency for Celery; Upstash optional (see §6) |
| Images | **Cloudinary** | Durable media; VPS disk/volumes are not enough alone |
| LLM / search / weather | **External APIs** | Groq, Tavily, OpenWeather via env keys |

---

## 3. Before you buy Contabo (checklist)

### Do you need to buy a domain *right now*?

**No.** You can deploy and test without a custom domain.

| Phase | Domain needed? | What to use |
|-------|----------------|-------------|
| **Tomorrow (first Contabo + Vercel)** | Optional | Contabo **public IP** for API (`http://YOUR_IP/...`); Vercel free URL (`https://….vercel.app`) |
| **HTTPS on Contabo (Let’s Encrypt)** | Yes | Certbot needs a hostname pointing at the VPS |
| **Production / pilot** | Strongly yes | Stable URLs for CORS, Google OAuth, M-Pesa callbacks, farmer trust |

**Practical plan:** Buy Contabo tomorrow, deploy on the IP, connect Vercel with `NEXT_PUBLIC_API_URL=http://YOUR_IP` (or temporary HTTP). Buy a domain within a few days when you want HTTPS and public sharing. Prefer something short (e.g. `.africa` / `.ke` / `.com`) you can use as `api.yourdomain.com`.

Without a domain you cannot finish §4 Step 10 (TLS). Stay on HTTP only for private testing; do not point real farmers or M-Pesa at a bare IP over HTTP.

1. **Domain** — buy when ready for HTTPS / public URL; until then use VPS IP + `*.vercel.app`.
2. **Accounts to create today/tonight** (free tiers are fine to start):
   - [Cloudinary](https://cloudinary.com) — image uploads
   - [Groq](https://console.groq.com) — AgriBot + scan reports (you likely have this)
   - [SendGrid](https://sendgrid.com) — transactional email (optional but recommended)
   - Google Cloud Console — OAuth client for production redirect URIs (if using Google login)
3. **SSH key** on your laptop (`ssh-keygen -t ed25519` if you don’t have one)
4. **Contabo order options** (recommended):
   - Plan: **Cloud VPS 4** (~€5.50 / ~$5–6) — **4 vCPU, 8 GB RAM**, ≥75–100 GB SSD/NVMe
   - OS: **Ubuntu 24.04 LTS**
   - Region: closest to Kenya users if available (or EU default)
   - Prefer **NVMe** if the order form offers it at no extra cost

You do **not** need a separate managed Redis or managed Postgres on day one — Compose already runs both on the VPS.

---

## 4. Step-by-step: Contabo VPS setup

### Step 1 — Provision and first login

1. Buy the VPS; note the **public IP** and root password (or inject your SSH key in Contabo panel).
2. From your laptop:

```bash
ssh root@YOUR_VPS_IP
```

3. Create a deploy user (safer than living as root):

```bash
adduser agriscan
usermod -aG sudo agriscan
mkdir -p /home/agriscan/.ssh
# paste your public key into /home/agriscan/.ssh/authorized_keys
chmod 700 /home/agriscan/.ssh
chmod 600 /home/agriscan/.ssh/authorized_keys
chown -R agriscan:agriscan /home/agriscan/.ssh
```

4. Optional: disable password SSH login after key auth works (`PasswordAuthentication no` in `/etc/ssh/sshd_config`, then `systemctl reload ssh`).

### Step 2 — System packages + Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw fail2ban

# Docker Engine + Compose plugin (official install)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker agriscan
# log out and back in so docker group applies
```

Verify:

```bash
docker --version
docker compose version
```

### Step 3 — Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

**Do not** expose Postgres `5432` or Redis `6379` to the public internet. Compose keeps them on the internal Docker network. Production uses `infra/docker-compose.yml` only (the override file that publishes those ports is for local laptop parity).

### Step 4 — DNS (skip until you buy a domain)

**No domain yet?** Skip this step. Reach the API at `http://YOUR_VPS_IP/` (nginx on port 80). Set:

```bash
ALLOWED_HOSTS=YOUR_VPS_IP,localhost
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,http://YOUR_VPS_IP
```

Browsers may warn on mixed content if the Vercel site is HTTPS and the API is HTTP — for private testing that is acceptable; for a public launch, buy a domain and finish Step 10.

**When you have a domain**, in your DNS provider:

| Type | Name | Value |
|------|------|--------|
| A | `api` | `YOUR_VPS_IP` |

Wait until `dig +short api.yourdomain.com` returns the VPS IP before enabling HTTPS.

### Step 5 — Clone the repo on the VPS

```bash
sudo mkdir -p /opt/agriscan
sudo chown agriscan:agriscan /opt/agriscan
su - agriscan
cd /opt/agriscan
git clone https://github.com/YOUR_ORG/crop_AI_analyzer.git .
# or use a deploy key / private clone URL
```

### Step 6 — Production env file

```bash
cd /opt/agriscan/infra
cp .env.example .env
chmod 600 .env
nano .env   # or vim
```

**Minimum production values:**

```bash
# --- Postgres ---
POSTGRES_USER=agriscan
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=agriscan

# --- Django ---
SECRET_KEY=<django-secret-key>          # python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=False
DEV_ENV=False                           # CRITICAL — never True on Contabo

# Day-one (no domain) — use the VPS public IP:
# ALLOWED_HOSTS=91.x.x.x
# CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
# CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,http://91.x.x.x

# After you buy a domain + TLS:
ALLOWED_HOSTS=api.yourdomain.com
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com,https://api.yourdomain.com

# Redis/Celery — Compose sets these for containers; keep as in .env.example:
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Inference knobs (8 GB)
MAX_LOADED_CROP_MODELS=2
RERANKER_ENABLED=false
GUNICORN_WORKERS=2
MAX_QUEUED_SCAN_JOBS=20

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
# IMPORTANT: Django code reads CONSUMER_KEY / CONSUMER_SECRET (not MPESA_CONSUMER_*).
CONSUMER_KEY=...
CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
```

Also set a strong `ADMIN_PASSWORD` if you use the custom admin bootstrap path (code has a default — change it).

### Step 7 — Crop models volume

Scanner worker mounts `models_data` at `/models`. Populate it once after first build:

```bash
cd /opt/agriscan/infra
docker compose up -d postgres redis   # start deps first if needed

# Copy .h5 models from the repo into the named volume (adjust path if needed)
docker compose run --rm -v "$(pwd)/../apps/api/main_app/CropModels:/src:ro" worker_scanner \
  sh -c 'cp -n /src/*.h5 /models/ 2>/dev/null || cp -rn /src/* /models/; ls -la /models'
```

If models are large and not in git, `scp` them to the VPS then copy into the volume the same way. Without models, scan jobs stay queued/fail.

### Step 8 — First deploy

```bash
cd /opt/agriscan/infra
chmod +x scripts/*.sh
./scripts/deploy.sh
```

Or manually:

```bash
docker compose build
docker compose run --rm api python manage.py migrate --noinput
docker compose run --rm api python manage.py collectstatic --noinput
docker compose up -d
docker compose ps
docker compose logs -f api worker_scanner
```

### Step 9 — Create Django superuser

```bash
docker compose exec api python manage.py createsuperuser
```

### Step 10 — HTTPS (Let’s Encrypt) — requires a domain

Skip until DNS for `api.yourdomain.com` points at the VPS. Until then, verify with:

```bash
curl -I http://YOUR_VPS_IP/api/v1/health/
```

When the domain is ready:

1. Confirm HTTP works: `curl -I http://api.yourdomain.com/api/v1/health/`
2. Issue cert:

```bash
docker compose --profile certs run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d api.yourdomain.com \
  --email you@yourdomain.com --agree-tos --no-eff-email
```

3. Edit `infra/nginx/conf.d/api.conf`: set `server_name`, uncomment the `listen 443 ssl` block, point cert paths at `/etc/letsencrypt/live/api.yourdomain.com/`.
4. Reload nginx:

```bash
docker compose up -d --build nginx
```

5. Add a renew cron on the host (example monthly):

```bash
# crontab -e as agriscan
0 3 1 * * cd /opt/agriscan/infra && docker compose --profile certs run --rm certbot renew && docker compose exec nginx nginx -s reload
```

### Step 11 — KAMIS price DB on the VPS

The market API reads offline SQLite (`apps/api/data/kamis_prices.db`). Options:

**A (simple):** Ensure the file is in the image/repo when you build (GitHub Action already commits updates). Redeploy periodically so Contabo picks up fresh data.

**B (better):** Cron on Contabo:

```bash
# crontab -e
0 */6 * * * cd /opt/agriscan/infra && docker compose exec -T api python manage.py ingest_kamis_prices >> /var/log/kamis-ingest.log 2>&1
```

(May need a writable mount for `data/` if the image filesystem is read-only — if ingest fails, bind-mount `../apps/api/data` into the api service.)

### Step 12 — Backups

```bash
cd /opt/agriscan/infra
./scripts/backup-volumes.sh
# copies to infra/backups/pg_*.sql
```

Schedule weekly + enable **Contabo snapshots** in the control panel. Offsite: `scp` SQL dumps to your laptop or object storage.

---

## 5. Step-by-step: Vercel (frontend)

This is also your **frontend CI/CD**: once the project is linked to GitHub, every push that affects `apps/web` redeploys automatically. Contabo API deploys are separate (§10).

1. Push the monorepo to GitHub (if not already).
2. [Vercel](https://vercel.com) → New Project → import the repo.
3. **Root Directory:** `apps/web`
4. Framework: Next.js (auto-detected)
5. Environment variable:

| Phase | `NEXT_PUBLIC_API_URL` |
|-------|------------------------|
| **No domain yet** | `http://YOUR_VPS_IP` |
| **Domain + TLS ready** | `https://api.yourdomain.com` |

6. Deploy. Note the URL (`https://agriscan-xxx.vercel.app`) — no custom domain required on Vercel day one.
7. Update Contabo `infra/.env`:
   - `CORS_ALLOWED_ORIGINS` must include the Vercel URL (and custom domain if any)
   - `CSRF_TRUSTED_ORIGINS` same
   - `ALLOWED_HOSTS` must include the VPS IP or `api.yourdomain.com`
8. Restart API so CORS reloads:

```bash
cd /opt/agriscan/infra
docker compose up -d api
```

9. Later: attach a custom domain in Vercel and add it to CORS/CSRF lists.

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

| Option | When to use |
|--------|-------------|
| **Redis in Compose** (default) | Recommended. Zero extra cost, low latency for Celery on the same host, already in memory budget (256 MB). |
| **Upstash Redis** | Only if you outgrow the VPS, need multi-region, or run API elsewhere without a local Redis. |

If you ever switch to Upstash:

1. Create Upstash Redis DB → copy Redis URL (`rediss://…`).
2. Set in `infra/.env`:

```bash
REDIS_URL=rediss://default:PASSWORD@xxx.upstash.io:6379
CELERY_BROKER_URL=rediss://default:PASSWORD@xxx.upstash.io:6379
CELERY_RESULT_BACKEND=rediss://default:PASSWORD@xxx.upstash.io:6379
```

3. You can stop/remove the local `redis` service — but you must also remove `depends_on: redis` healthchecks or Compose will wait forever. Prefer keeping local Redis until that refactor is deliberate.

**Do not** set `USE_LOCMEM_CACHE=True` or `DEV_ENV=True` on Contabo — Celery and caching will misbehave under load.

### 6.3 Postgres — stay on Contabo

Managed Postgres (Neon, Supabase, Contabo DB) is optional later. Day-one Compose Postgres + volume `pgdata` + `backup-volumes.sh` is enough. If you move to managed Postgres later, set `DATABASE_URL` and `DB_SSL_REQUIRE=true` and drop the local `postgres` service.

### 6.4 SendGrid (email)

Needed for password reset / notifications if you enable them. Set `SENDGRID_API_KEY`, `EMAIL_HOST_USER=apikey`, `DEFAULT_FROM_EMAIL`. Verify the sender domain in SendGrid.

### 6.5 Groq / Tavily / OpenWeather / Hugging Face

| Key | Feature |
|-----|---------|
| `GROQ_API_KEY` | AgriBot chat, scan report narrative, USSD tips |
| `TAVILY_API_KEY` | Web search for AgriBot |
| `OPEN_WEATHER_API_KEY` | Weather widgets |
| `HF_MODEL_REPO_ID` | Optional remote model pull |

Without Groq, chat/report quality drops; scans can still classify via local TF if models are loaded.

### 6.6 Google OAuth

Add production redirect URIs in Google Cloud Console for your Contabo/Vercel URLs. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `infra/.env`.

### 6.7 M-Pesa

Code expects **`CONSUMER_KEY`** and **`CONSUMER_SECRET`** (see `mpesa_utils`). The `.env.example` names `MPESA_CONSUMER_*` are **not** read by Django today — set both naming styles or fix the code before go-live. Callback URL must hit `https://api.yourdomain.com/...` over HTTPS.

### 6.8 USSD

Keep `USSD_PROVIDER=simulate` until Africa’s Talking / Twilio / TextSMS credentials exist. Then set provider keys and point the webhook at `POST https://api.yourdomain.com/api/v1/ussd/`.

---

## 7. Post-deploy verification

Run through this on a real phone/browser after Contabo + Vercel are live. Use `http://YOUR_VPS_IP` until you have TLS.

| # | Check | Expected |
|---|--------|----------|
| 1 | `GET http://YOUR_VPS_IP/api/v1/health/` (or `https://api.…`) | JSON: postgres + redis OK, `"dev_env": false` |
| 2 | Open Vercel site → Login / Signup | JWT issued; no CORS errors in DevTools |
| 3 | Farmer profile photo upload | Cloudinary URL stored |
| 4 | Crop scan | Job leaves `queued` → `completed`; scanner worker logs show inference |
| 5 | AgriBot chat | Groq response returns |
| 6 | Market / KAMIS prices | Non-empty prices from SQLite |
| 7 | `docker stats` on VPS | No service thrashing near 8 GB; scanner &lt; 2.5 GB |
| 8 | Backup | `./scripts/backup-volumes.sh` produces SQL dump |
| 9 | Push a small API change to `main` | GitHub Action **Deploy Contabo** succeeds; health still OK |
| 10 | Push a web-only change | Vercel redeploys; Contabo workflow does **not** need to run |

Local QA before Contabo: follow [`LOCAL_TESTING.md`](./LOCAL_TESTING.md) with `DEV_ENV=True`, then flip to production flags as above.

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

1. **`DEV_ENV=False` and `DEBUG=False`** — non-negotiable on Contabo.
2. **Cloudinary** — do not rely on `media_tmp` alone.
3. **M-Pesa env name mismatch** — set `CONSUMER_KEY` / `CONSUMER_SECRET`.
4. **Domain / TLS** — optional for private IP testing; required before public pilot, OAuth production redirects, and M-Pesa callbacks. Uncomment nginx SSL after certbot.
5. **Models volume** — empty `/models` → scans never finish.
6. **KAMIS** — refresh SQLite on VPS (cron or redeploy from Actions-updated git).
7. **CI/CD secrets** — `CONTABO_HOST` / `CONTABO_USER` / `CONTABO_SSH_KEY` must be set or Contabo will not auto-update on push.
8. **Change default `ADMIN_PASSWORD`** if used.
9. **Do not commit** real `.env` or OAuth client secret JSON under `docs/`.
10. **Compose override** — never use `docker-compose.override.yml` on Contabo (it publishes DB/Redis ports and uses `runserver`). Prefer:

```bash
docker compose -f docker-compose.yml up -d --build
```

---

## 10. CI/CD — push to GitHub → update Contabo (+ Vercel)

You want two pipelines, not one:

| Change | Who deploys | How |
|--------|-------------|-----|
| `apps/web/**` | **Vercel** | Auto on every push (connect the GitHub repo; root dir `apps/web`) |
| `apps/api/**` or `infra/**` | **Contabo** | GitHub Action SSHs in and runs `infra/scripts/deploy.sh` |

Workflow file already in the repo: [`.github/workflows/deploy-contabo.yml`](../.github/workflows/deploy-contabo.yml).

### 10.1 One-time: SSH deploy key on the VPS

On your **laptop**:

```bash
ssh-keygen -t ed25519 -C "github-actions-contabo" -f ~/.ssh/agriscan_deploy -N ""
```

On the **VPS** (as `agriscan`):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys   # contents of agriscan_deploy.pub
chmod 600 ~/.ssh/authorized_keys
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

| Secret | Example |
|--------|---------|
| `CONTABO_HOST` | `91.x.x.x` or `api.yourdomain.com` |
| `CONTABO_USER` | `agriscan` |
| `CONTABO_SSH_KEY` | Full private key (`-----BEGIN OPENSSH PRIVATE KEY-----` …) from `agriscan_deploy` |
| `CONTABO_SSH_PORT` | `22` (optional) |
| `CONTABO_APP_DIR` | `/opt/agriscan` (optional) |

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

CI/CD assumes the VPS already has Docker, `/opt/agriscan` cloned, `infra/.env` filled, and models loaded once (§4). Actions only **update** that install.

### 10.6 Safety tips

- Protect `main` with a required PR review if others push.  
- Never put `infra/.env` secrets in GitHub Actions env for this SSH flow — they stay on the VPS.  
- Watch Actions logs + `docker compose logs` after the first auto-deploy.  
- Manual fallback: SSH in and run `./scripts/deploy.sh` yourself.

---

## 11. Suggested order for tomorrow

1. Buy Contabo Cloud VPS 4 (Ubuntu 24.04, 8 GB). **Domain can wait.**
2. Create Cloudinary + confirm Groq key.
3. Deploy on the **VPS IP** first (HTTP). Add domain + certbot when you buy DNS.
4. Follow §4 (Docker → `.env` → models → `deploy.sh`).
5. Deploy `apps/web` on Vercel with `NEXT_PUBLIC_API_URL=http://YOUR_IP` (switch to `https://api.…` later).
6. Wire §10 CI/CD secrets so Contabo updates on push.
7. Align CORS, run §7 verification checklist.
8. Schedule backups + KAMIS cron.

When that passes, the production path is: **Vercel for UI, Contabo Docker for API/AI, Cloudinary for files, Redis+Postgres on-box for speed and cost.**
