# AgriScan web (Next.js App Router)

## Setup

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — API defaults to `http://localhost:8000`.

## Routes

| Path | Role |
|------|------|
| `/` | Marketing |
| `/login`, `/signup/*` | Auth |
| `/farmer/*` | Scan, AgriBot, inputs, market, profile |
| `/buyer/dashboard` | Buyers |
| `/agency/dashboard` | Input agencies |
| `/lender/*` | Partner portal + API keys |
| `/admin/*` | Staff |

Deploy on Vercel with `NEXT_PUBLIC_API_URL` pointing at Contabo nginx.
