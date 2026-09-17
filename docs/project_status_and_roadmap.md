# AgriScan — Project Status and Team Roadmap

**Document owner:** Stephen Kingori (Product / delivery)  
**Approved by:** Job Nyaribari (Founder)  
**Version:** 1.1  
**Date:** 17 September 2026  
**Review cadence:** every Monday (15 minutes), full rewrite at the end of each 30-day block

This is the working document for the founding team. Use it to see what is true today, who does what, and what must ship in the next 30 days. Older docs (`concept_note.md`, `proposal.md`, `summary.md`) still describe an earlier four-person team; this file is the source of truth for roles until those are updated.

---



## 1. How to use this document


| If you need…                        | Look at…                         |
| ----------------------------------- | -------------------------------- |
| What is already built               | §3 Status by workstream          |
| Who does what                       | §2 Team                          |
| How we work together in the repo    | §4 Collaboration pipelines       |
| What happens this month             | §5 30-day plan                   |
| What waits for the field specialist | §6 Parked agronomy work          |
| Whether we are on track             | §7 Stage gates and weekly ritual |


**Rule:** every workstream has one accountable owner. Helpers can contribute; they do not replace the owner.

---



## 2. Team

AgriScan is in the **idea / pre-seed** company stage: a working product exists, but farmer demand, agronomic truth, and a repeatable offer are not yet proven. Titles below are function hats, not a corporate org chart.

### Who does what


| Person               | Role                                   | Owns (outcomes)                                                                                                          |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Job Nyaribari**    | Founder / AI lead                      | Company direction, fundraising, partnerships, AI diagnosis quality, AgriBot safety                                       |
| **Wilson Kabucho**   | Chief technology officer               | Architecture, security, DevOps, production uptime, what gets merged                                                      |
| **Brian Ziro**       | Finance and operations lead            | Runway, books, filings, M-Pesa going live, payment records, basic compliance                                             |
| **Stephen Kingori**  | Product / project manager and IoT lead | Backlog, weekly status, crop-recommendation integration, IoT prototype, farmer interviews until a field specialist joins |
| **Emilio Kamau**     | Growth lead and ML support             | Farmer acquisition experiments, messaging, demos, content, early partnerships support; ML help to Job                    |
| **Field specialist** | Agronomy / farmer success *(to hire)*  | Field protocols, agronomic review, sensor calibration, Kiswahili advice accuracy                                         |


### Role explanations

**Job Nyaribari — Founder / AI lead**  
Sets company direction and represents AgriScan externally (partners, funders). Owns the quality and safety of crop-scan models and AgriBot advice. Unblocks money and partnership decisions. Does not run day-to-day servers or the weekly backlog.

**Wilson Kabucho — CTO**  
Owns how the system is built, secured, deployed, and kept up. Reviews and merges work into production. Is the person to ask when something is down, insecure, or not deployable. Does not own farmer interviews or marketing copy.

**Brian Ziro — Finance and operations**  
Owns company money: runway, books, filings, and making M-Pesa real (live payments that can be reconciled). Owns basic compliance and consent records for money and user data. Does not own platform architecture.

**Stephen Kingori — Product / project manager and IoT lead**  
Owns the backlog, this document, and the weekly rhythm. Delivers crop-recommendation integration and the IoT prototype path. Runs farmer interviews until a field specialist joins. Does not own final AI model architecture or production DevOps.

**Emilio Kamau — Growth lead and ML support**  
Owns getting real farmers in front of the product: conversations, demos, messaging, and early growth experiments. Supports Job on ML eval and model notes. Does not act as a second AI lead or run paid ads at scale.

**Field specialist — Agronomy / farmer success *(to hire)***  
Will own field protocols, agronomic review of labels and advice, sensor calibration, and Kiswahili accuracy. Until hired, the team does not invent new agronomic claims without Job’s written OK and a visible advisory disclaimer.

---



## 3. Current status (17 September 2026)

**One-line status:** The platform is past a slide deck. The company is not. The next 30 days prove that real farmers will use a thin, reliable slice of AgriScan — not that every planned module exists.

Live / in-repo today:

- Next.js farmer, buyer, agency, lender, and admin portals (`apps/web`)
- Django API with JWT auth, wallets, scans, AgriBot, marketplace, KAMIS prices (`apps/api`)
- Crop-scan pipeline (gatekeeper + crop models) and scan jobs
- AgriBot chat (Groq / RAG)
- M-Pesa top-up code and callback path (production cutover still open)
- USSD menu engine + homepage simulator (live telecom provider not wired)
- Farm Health Score and lender API
- Docker / Contabo deploy path, Vercel frontend, Capacitor Android wrap
- Public site: [agriscan.co.ke](https://agriscan.co.ke)

Not done:

- Crop-recommendation model integrated into Django / the farmer UI
- Production M-Pesa with real settlements and reconcilable books
- Live SMS / USSD with a telecom provider
- IoT devices, telemetry API, and field dashboards
- Agronomist-reviewed labels, advice, and field pilots
- Repeatable farmer onboarding with evidence of retention



### Status by workstream


| Workstream                          | Status                              | Evidence of “done”                                                                             | Owner                                           |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Company / fundraising**           | In progress                         | One-pager, pipeline of 10 conversations, clear ask                                             | Job                                             |
| **Production platform**             | Partial                             | Staging + production healthy; backups restore; deploy from approved merges                     | Wilson                                          |
| **AI crop diagnosis**               | Built, unvalidated in field         | Scans work in product; no agronomist agreement study yet                                       | Job                                             |
| **AgriBot / RAG**                   | Built, unvalidated in field         | Chat works; advice not field-reviewed                                                          | Job                                             |
| **ML support / eval**               | Early                               | Shared eval notes; no weekly model review yet                                                  | Emilio (support), Job (accountable)             |
| **Crop recommendation**             | Not integrated                      | Farmer can submit N, P, K, pH, temp, humidity, rainfall and see a versioned result in AgriScan | Stephen                                         |
| **Farmer / buyer / agency product** | Partial                             | Core journeys work; crop rec and IoT screens missing                                           | Stephen                                         |
| **IoT field layer**                 | Not started                         | Device identity, telemetry API, one calibrated plot                                            | Stephen                                         |
| **Payments / M-Pesa**               | Code ready, not production-complete | Live STK, callback, wallet credit, Brian can reconcile                                         | Brian                                           |
| **Finance / ops / compliance**      | Not started as a company system     | Monthly cash view, receipts, consent register                                                  | Brian                                           |
| **USSD / SMS**                      | Simulator only                      | Provider webhook live; 10 farmers complete a real session                                      | Brian (provider + billing), Stephen (menu / UX) |
| **Growth / farmer discovery**       | Not started                         | 30 farmer conversations logged; 10 using the product twice                                     | Emilio                                          |
| **Marketplace / KAMIS**             | Partial                             | Prices and directories exist; paid connections not proven                                      | Emilio (demand), Stephen (product)              |
| **Lender / Farm Health Score**      | Infrastructure only                 | Do not sell until farmer usage and consent are real                                            | Job (partner talks), Wilson (API)               |
| **Field validation / agronomy**     | Parked                              | Specialist hired or advisor contracted                                                         | Field specialist *(later)*                      |


---



## 4. Collaboration pipelines

How the team ships work together. Follow these unless Wilson (for repo/deploy) or Stephen (for product process) say otherwise.

### Git and branches

- **Do not commit or push directly to `main`.** `main` is production-protected.
- Day-to-day work lands on a shared **`development`** branch (or the branch Wilson names as the current integration branch).
- For a feature or fix: branch off `development` (e.g. `feat/crop-rec-api`, `fix/mpesa-callback`), open a pull request **into `development`**, and get a review before merge.
- Only Wilson (or someone Wilson designates) merges `development` → `main` for a production release.
- Never put secrets, production credentials, or `.env` files in git.

### Pull requests and review

- Every change that affects shared code goes through a PR with a short description of *why*.
- Tag the relevant owner for review (AI → Job; infra/API core → Wilson; product/IoT → Stephen; payments → Brian; growth-facing copy/pages → Emilio).
- Do not merge your own PR to `development` without at least one approving review, except for trivial doc-only fixes Stephen or Wilson explicitly allow.

### Environments and deploys

- Local / staging first; production only after the change is on `development` and Wilson has green-lit a release.
- If production breaks, Wilson leads the fix; everyone else stops merging until the incident is clear.

### Product and delivery rhythm

- Stephen owns the backlog and this file; file product requests with Stephen, not by opening random PRs that expand scope.
- Monday standup (see §7): report on owned items only.
- Farmer conversation notes go into the shared log Emilio writes and Stephen files.

### When two people disagree

Job decides the same day. Do not leave conflicts for the next Monday.

---



## 5. Roadmap — next 30 days

**Stage goal (idea stage):** prove problem–solution fit on a thin slice.

Thin slice for this 30-day block (17 Sep – 17 Oct 2026):

1. A farmer can register, scan a leaf, get a cautious result, and top up with M-Pesa (or we have a dated cutover plan with test evidence).
2. Crop-recommendation integration is designed and in progress toward a farmer-facing result in AgriScan.
3. The team has spoken to at least 10 farmers and started a shared conversation log.
4. Production stays healthy, public claims match what is live, and everyone can name their role and weekly meeting.

Do **not** chase 10,000 farmers, drones, or bank contracts this month.


| Item                                      | Done when                                                         | Owner   | Support     |
| ----------------------------------------- | ----------------------------------------------------------------- | ------- | ----------- |
| Freeze this operating model with the team | Everyone can name their role and weekly meeting                   | Stephen | Job         |
| Production health checklist               | Health endpoint, backups, deploy notes used by Wilson without Job | Wilson  | Job         |
| Shared `development` branch workflow live | Team commits via PRs to `development`, not `main`                 | Wilson  | All         |
| M-Pesa production cutover plan            | Credentials, callback URL, test pay, reconcilable txn list        | Brian   | Wilson      |
| Crop recommender integration design       | API contract, model/scaler version, farmer screen sketch          | Stephen | Job, Wilson |
| Farmer discovery script                   | 10 conversations completed and written up                         | Emilio  | Stephen     |
| Public claims audit                       | Site and decks only describe what is actually live                | Job     | Emilio      |
| Field-specialist profile                  | One-page role and where we will look                              | Job     | Stephen     |


### After this 30-day block

At the end of the block, Stephen rewrites §5 for the next 30 days. Likely next themes (not commitments yet):

- Crop recommendation live in AgriScan with logged inputs
- M-Pesa live for wallet top-up with weekly recon
- More farmer conversations and repeat product sessions
- IoT prototype spec and first bench path
- Idea-stage gate review (see §7)

Only start these after a later gate review:

- Field plots and agronomist comparison (needs field specialist)
- SMS/USSD scale and paid telecom traffic
- Agency subscriptions and marketplace fees
- Lender API commercial contracts
- Multi-county expansion

---



## 6. Parked until the field specialist joins

Do not silently dump these onto Stephen or Emilio. Track them here; start hiring/advising in parallel.


| Parked item                                 | Why it cannot wait forever               | Interim rule                                                       |
| ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| Agronomic review of diagnosis labels        | Wrong disease names harm farmers         | Keep “advisory only” copy; log uncertain scans                     |
| Review of AgriBot / Kiswahili advice        | Hallucinated treatment is a safety issue | Job tightens prompts; no pesticide dosing claims                   |
| Crop-recommender local validation           | Notebook accuracy ≠ Kenyan fields        | Ship as experimental; store inputs for later review                |
| Sensor calibration vs reference soil tests  | Cheap NPK sensors drift                  | No farmer-facing IoT numbers until a protocol exists               |
| Field-pilot design (plots, consent, visits) | This is the seed-stage proof             | Emilio/Stephen only do discovery interviews, not scientific trials |
| Escalation path to extension officers       | Product already promises this            | Document the intended flow; do not automate it yet                 |


**Hiring note (Job):** look for a part-time agronomist or county extension partner before another engineer. Stephen will keep a running list of questions that person must answer.

---



## 7. Stage gates and weekly ritual



### We leave idea stage when all of these are true

1. 30 farmer conversations exist in writing.
2. 10 farmers came back a second time without us standing over them.
3. Scan + wallet top-up work in production.
4. Crop recommendation runs inside AgriScan and logs every request.
5. Brian can show a one-page money picture.
6. The team has a named field-specialist candidate or a dated plan to get one.

Until then, new features lose to reliability, farmer conversations, and the thin slice above.

### Monday 15-minute standup (Stephen runs)

Each person answers only:

1. What I moved last week on **my** owned items
2. What is blocked
3. What I will finish by Friday

Stephen updates the table in §5 (status: not started / in progress / done / blocked). Job unblocks partnerships and money. Wilson unblocks technical risk.

### Shared artefacts Stephen maintains

- This file  
- A one-page weekly status (copy the §5 table and mark it)  
- Farmer conversation log (Emilio writes; Stephen files)  
- Open questions for the future field specialist

---



## 8. Risks the team must not ignore


| Risk                                                            | Owner of the mitigation                            |
| --------------------------------------------------------------- | -------------------------------------------------- |
| Four technical voices, no farmer voice                          | Emilio + Stephen: interviews every week            |
| Founder stuck on servers instead of the company                 | Wilson takes DevOps; Job stays on AI + fundraising |
| M-Pesa “almost working” with no books                           | Brian: no feature is live until it reconciles      |
| Shipping IoT before a calibration plan                          | Stephen: bench test only after this 30-day design  |
| Marketing a universal platform that farmers cannot finish using | Job + Emilio: claims match §3                      |
| Agronomy gap while we hire                                      | Job: freeze new agronomic claims                   |
| Direct commits to `main` / broken release process               | Wilson: enforce PRs via `development`              |


---



## 9. Contact and working agreement

- Product questions and the backlog → **Stephen Kingori**  
- Production / security / deploy → **Wilson Kabucho**  
- Money, M-Pesa, filings → **Brian Ziro**  
- Farmers, demos, messaging → **Emilio Kamau**  
- Company, partners, AI → **Job Nyaribari**

If two owners disagree, Job decides the same day. Do not leave conflicts for the next Monday.
