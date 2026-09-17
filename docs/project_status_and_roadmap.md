# AgriScan — Project Status and Team Roadmap

**Document owner:** Stephen Kingori (Product / delivery)  
**Approved by:** Job Nyaribari (Founder)  
**Version:** 1.0  
**Date:** 17 September 2026  
**Review cadence:** every Monday (15 minutes), full rewrite at the end of each 30-day block

This is the working document for the founding team. Use it to see what is true today, who owns what, and what must ship in the next 90 days. Older docs (`concept_note.md`, `proposal.md`, `summary.md`) still describe an earlier four-person team; this file is the source of truth for roles until those are updated.

---

## 1. How to use this document

| If you need… | Look at… |
|---|---|
| What is already built | §3 Status by workstream |
| Who decides / who does the work | §2 Team and §4 Assignment matrix |
| What happens this month | §5 30 / 60 / 90-day plan |
| What waits for the field specialist | §6 Parked agronomy work |
| Whether we are on track | §7 Stage gates and weekly ritual |

**Rule:** every workstream has one accountable owner. Helpers can contribute; they do not replace the owner.

---

## 2. Team

AgriScan is in the **idea / pre-seed** company stage: a working product exists, but farmer demand, agronomic truth, and a repeatable offer are not yet proven. Titles below are function hats, not a corporate org chart.

| Person | Role | Owns (outcomes) | Does not own |
|---|---|---|---|
| **Job Nyaribari** | Founder / CEO and AI lead | Company direction, fundraising, partnerships, AI diagnosis quality, AgriBot safety | Day-to-day servers, weekly backlog, farmer outreach volume |
| **Wilson Kabucho** | Chief technology officer | Architecture, security, DevOps, production uptime, what gets merged | Farmer interviews, books, marketing copy |
| **Brian Ziro** | Finance and operations lead | Runway, books, filings, M-Pesa going live, payment records, basic compliance | Platform architecture (that is Wilson) |
| **Stephen Kingori** | Product / project manager and IoT lead | Backlog, weekly status, crop-recommendation integration, IoT prototype, farmer interviews until a field specialist joins | Final AI model architecture, production DevOps |
| **Emilio Kamau** | Growth lead and ML support | Farmer acquisition experiments, messaging, demos, content, early partnerships support; ML help to Job | Second AI lead, paid ad campaigns at scale |
| **Field specialist** | Agronomy / farmer success *(to hire)* | Field protocols, agronomic review, sensor calibration, Kiswahili advice accuracy | Software delivery |

### Decision rights

| Decision | Decides | Consulted |
|---|---|---|
| What we build this month | Stephen, with Job’s yes/no | Wilson (feasibility), Emilio (farmer signal) |
| Technical approach and merge | Wilson | Job (AI), Stephen (IoT / recommender), Brian (payments) |
| Money out / runway / pricing | Job + Brian | Stephen (product impact) |
| External partnerships and fundraising | Job | Emilio (farmer/partner intros), Brian (terms) |
| Agronomic claims in the product | Field specialist when hired; until then **no new agronomic claims** without Job’s written OK and a visible advisory disclaimer | Stephen, Emilio |

---

## 3. Current status (17 September 2026)

**One-line status:** The platform is past a slide deck. The company is not. Next 90 days prove that real farmers will use a thin, reliable slice of AgriScan — not that every planned module exists.

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

| Workstream | Status | Evidence of “done” | Owner |
|---|---|---|---|
| **Company / fundraising** | In progress | One-pager, pipeline of 10 conversations, clear ask | Job |
| **Production platform** | Partial | Staging + production healthy; backups restore; deploy on `main` | Wilson |
| **AI crop diagnosis** | Built, unvalidated in field | Scans work in product; no agronomist agreement study yet | Job |
| **AgriBot / RAG** | Built, unvalidated in field | Chat works; advice not field-reviewed | Job |
| **ML support / eval** | Early | Shared eval notes; no weekly model review yet | Emilio (support), Job (accountable) |
| **Crop recommendation** | Not integrated | Farmer can submit N, P, K, pH, temp, humidity, rainfall and see a versioned result in AgriScan | Stephen |
| **Farmer / buyer / agency product** | Partial | Core journeys work; crop rec and IoT screens missing | Stephen |
| **IoT field layer** | Not started | Device identity, telemetry API, one calibrated plot | Stephen |
| **Payments / M-Pesa** | Code ready, not production-complete | Live STK, callback, wallet credit, Brian can reconcile | Brian |
| **Finance / ops / compliance** | Not started as a company system | Monthly cash view, receipts, consent register | Brian |
| **USSD / SMS** | Simulator only | Provider webhook live; 10 farmers complete a real session | Brian (provider + billing), Stephen (menu / UX) |
| **Growth / farmer discovery** | Not started | 30 farmer conversations logged; 10 using the product twice | Emilio |
| **Marketplace / KAMIS** | Partial | Prices and directories exist; paid connections not proven | Emilio (demand), Stephen (product) |
| **Lender / Farm Health Score** | Infrastructure only | Do not sell until farmer usage and consent are real | Job (partner talks), Wilson (API) |
| **Field validation / agronomy** | Parked | Specialist hired or advisor contracted | Field specialist *(later)* |

---

## 4. Assignment matrix

R = responsible (does the work) · A = accountable (the one person who can be asked “is this done?”) · C = consulted · I = informed

| Work | Job | Wilson | Brian | Stephen | Emilio | Field specialist *(later)* |
|---|---|---|---|---|---|---|
| Vision, fundraising, partnerships | **A/R** | C | C | I | C | I |
| Weekly plan and this document | C | C | C | **A/R** | C | I |
| Production DevOps, security, uptime | C | **A/R** | C | I | I | I |
| AI diagnosis models and gatekeeper | **A/R** | C | I | I | R | C |
| AgriBot quality and safety wording | **A/R** | C | I | C | R | C |
| Crop recommendation integration | C | C | I | **A/R** | C | C |
| IoT hardware, firmware path, telemetry | I | C | C | **A/R** | I | C |
| Farmer UX, backlog, acceptance | C | C | I | **A/R** | C | C |
| M-Pesa production and reconciliation | C | C | **A/R** | I | I | I |
| Company books, runway, filings | C | I | **A/R** | I | I | I |
| Data protection / consent register | C | C | **A/R** | I | I | C |
| Live USSD / SMS provider | I | C | **A/R** | R | C | I |
| Farmer interviews and field visits | C | I | I | R | **A/R** | R |
| Messaging, demos, early growth | C | I | I | C | **A/R** | C |
| Agronomic review and calibration | I | I | I | C | C | **A/R** |

### Code and product ownership (what you actually touch)

| Area in the repo / product | Primary | Backup |
|---|---|---|
| `apps/api/inference/`, scan models, gatekeeper | Job | Emilio |
| `apps/api/rag/`, AgriBot prompts and retrieval | Job | Emilio |
| `apps/api` architecture, auth, settings, tests | Wilson | Brian |
| `infra/`, Contabo, Docker, CI, backups, TLS | Wilson | Job |
| `apps/web` farmer journeys and product UX | Stephen | Wilson |
| Crop-recommendation service + farmer recommend UI | Stephen | Job |
| IoT API, device registry, plot dashboards | Stephen | Wilson |
| `mpesa_utils`, wallet, admin revenue | Brian | Wilson |
| USSD engine live cutover and provider secrets | Brian | Stephen |
| KAMIS / market pages, growth experiments | Emilio | Stephen |
| Android / Capacitor packaging | Wilson | Stephen |

---

## 5. Roadmap — next 90 days

**Stage goal (idea stage):** prove problem–solution fit on a thin slice.

Thin slice for this quarter:

1. A farmer can register, scan a leaf, get a cautious result, and top up with M-Pesa.  
2. A farmer (or Stephen in the field) can enter soil/climate values and get a crop recommendation stored in AgriScan.  
3. The team has spoken to at least 30 farmers and watched at least 10 of them use the product twice.  
4. Production stays up, money can be reconciled, and we stop claiming modules that are not live.

Do **not** chase 10,000 farmers, drones, or bank contracts this quarter.

### Days 1–30 (17 Sep – 17 Oct 2026) — make the core true

| Item | Done when | Owner | Support |
|---|---|---|---|
| Freeze this operating model with the team | Everyone can name their owner and weekly meeting | Stephen | Job |
| Production health checklist | Health endpoint, backups, deploy notes used by Wilson without Job | Wilson | Job |
| M-Pesa production cutover plan | Credentials, callback URL, test pay, reconcilable txn list | Brian | Wilson |
| Crop recommender integration design | API contract, model/scaler version, farmer screen sketch | Stephen | Job, Wilson |
| Farmer discovery script | 10 conversations completed and written up | Emilio | Stephen |
| Public claims audit | Site and decks only describe what is actually live | Job | Emilio |
| Field-specialist profile | One-page role and where we will look | Job | Stephen |

### Days 31–60 (18 Oct – 17 Nov 2026) — connect the farming loop

| Item | Done when | Owner | Support |
|---|---|---|---|
| Crop recommendation in AgriScan | Authenticated farmer gets a versioned result; inputs logged | Stephen | Wilson, Job |
| M-Pesa live for wallet top-up | Real STK, callback, wallet credit, Brian’s weekly recon | Brian | Wilson |
| 20 more farmer conversations + 10 product sessions | Notes in shared log; 3 product changes filed from them | Emilio | Stephen |
| IoT prototype spec and hardware shortlist | Device identity, payload, power, cost per plot | Stephen | Wilson |
| Model eval basics | Confusion notes on 2 crops; known failure cases listed | Job | Emilio |
| Company money view | Simple monthly cash, burn, and what 90 days of runway means | Brian | Job |

### Days 61–90 (18 Nov – 17 Dec 2026) — prove someone comes back

| Item | Done when | Owner | Support |
|---|---|---|---|
| 10 farmers used scan **or** recommend twice | Named farmers, not anonymous traffic | Emilio | Stephen |
| USSD live path decided | Provider chosen **or** explicitly deferred with reason | Brian | Stephen, Wilson |
| First IoT bench test | One device sends a valid reading to a non-prod API | Stephen | Wilson |
| Partnership list | 5 named targets (cooperative, agrovet, county, telco, funder) with next action | Job | Emilio |
| Idea-stage gate review | Team votes: stay in discovery, or move to a seed-shaped plan | Job | All |

### After day 90 (not this document’s commitment)

Only start these after the gate review:

- Field plots and agronomist comparison (needs field specialist)
- SMS/USSD scale and paid telecom traffic
- Agency subscriptions and marketplace fees
- Lender API commercial contracts
- Multi-county expansion

---

## 6. Parked until the field specialist joins

Do not silently dump these onto Stephen or Emilio. Track them here; start hiring/advising in parallel.

| Parked item | Why it cannot wait forever | Interim rule |
|---|---|---|
| Agronomic review of diagnosis labels | Wrong disease names harm farmers | Keep “advisory only” copy; log uncertain scans |
| Review of AgriBot / Kiswahili advice | Hallucinated treatment is a safety issue | Job tightens prompts; no pesticide dosing claims |
| Crop-recommender local validation | Notebook accuracy ≠ Kenyan fields | Ship as experimental; store inputs for later review |
| Sensor calibration vs reference soil tests | Cheap NPK sensors drift | No farmer-facing IoT numbers until a protocol exists |
| Field-pilot design (plots, consent, visits) | This is the seed-stage proof | Emilio/Stephen only do discovery interviews, not scientific trials |
| Escalation path to extension officers | Product already promises this | Document the intended flow; do not automate it yet |

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
- A one-page weekly status (copy the §5 tables and mark them)  
- Farmer conversation log (Emilio writes; Stephen files)  
- Open questions for the future field specialist  

---

## 8. Risks the team must not ignore

| Risk | Owner of the mitigation |
|---|---|
| Four technical voices, no farmer voice | Emilio + Stephen: interviews every week |
| Founder stuck on servers instead of the company | Wilson takes DevOps; Job stays on AI + fundraising |
| M-Pesa “almost working” with no books | Brian: no feature is live until it reconciles |
| Shipping IoT before a calibration plan | Stephen: bench test only this quarter |
| Marketing a universal platform that farmers cannot finish using | Job + Emilio: claims match §3 |
| Agronomy gap while we hire | Job: freeze new agronomic claims |

---

## 9. Contact and working agreement

- Product questions and the backlog → **Stephen Kingori**  
- Production / security / deploy → **Wilson Kabucho**  
- Money, M-Pesa, filings → **Brian Ziro**  
- Farmers, demos, messaging → **Emilio Kamau**  
- Company, partners, AI → **Job Nyaribari**  

If two owners disagree, Job decides the same day. Do not leave conflicts for the next Monday.
