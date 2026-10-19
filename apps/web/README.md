# Ukulima Bora web (Next.js App Router + Capacitor)

## Setup

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — API defaults to `http://localhost:8000`.

Set **`DEV_ENV=True`** on the Django API (see repo-root `.env` / `docs/LOCAL_TESTING.md`) so CORS does not block the SPA or the Android WebView.

## Routes

| Path | Role |
|------|------|
| `/` | Marketing + **USSD simulator** (`#ussd-demo`) |
| `/login`, `/signup/*` | Auth |
| `/farmer/*` | Scan, AgriBot, inputs, market prices, profile |
| `/agency/dashboard` | Input agencies |
| `/lender/*` | Partner portal + API keys |
| `/admin/*` | Staff |

## Capacitor (phone app)

```bash
# Dev: Capacitor loads http://localhost:3000 (see capacitor.config.ts)
# Android emulator API base:
#   NEXT_PUBLIC_API_URL=http://10.0.2.2:8000

npm run cap:sync
npm run cap:android
```

Native project: `android/`. Camera + cleartext HTTP are enabled for local API testing.

## Full QA checklist

See [docs/LOCAL_TESTING.md](../../docs/LOCAL_TESTING.md).

Deploy web on Vercel with `NEXT_PUBLIC_API_URL` pointing at Contabo nginx.
