# AgriScan web (Next.js) — Phase 2

Scaffold App Router here (`npx create-next-app@latest .`).

Target routes (see `docs/service_separation_plan.md` §5):

- `/` marketing
- `/login`, `/signup/farmer|buyer|agency|lender`
- `/farmer/*`, `/buyer/*`, `/agency/*`, `/lender/*`, `/admin/*`

Env:

```
NEXT_PUBLIC_API_URL=https://api.agriscan.example.com
```

Do not put Groq / M-Pesa / Daraja secrets in this app.
