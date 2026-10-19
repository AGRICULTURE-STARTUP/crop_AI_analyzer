# Ukulima Bora — UI/UX Workstream and Farm Records Plan

| | |
|---|---|
| **Owner** | Stephen Kingori — UI/UX |
| **Status** | Active |
| **Branch** | `feat/ui-ux-farm-records` (from `Development`) |
| **Last updated** | 6 October 2026 |
| **Read with** | `docs/project_status_and_roadmap.md` (§2 team, §4 collaboration, §7 stage gates) and `docs/SYSTEM_DOCUMENTATION.md` (§3.2 planned data entities) |

## In short

- **Every new feature gets its UI/UX from Stephen** — screens, flows, states, copy, accessibility and the front-end build (§1).
- **First new feature: Farm Records.** It starts with design: farmer validation, flows, wireframes, a clickable prototype. Engineering time is requested from Wilson when the data model and API are ready to build (§3).
- **In parallel:** a backlog of UI/UX improvements to existing screens (§4).
- **Everything lands through PRs into `Development`**, as the roadmap requires (§5). What UI/UX needs from each owner is in §6.
- **Built on this branch so far (§9):** a portal shell with role dashboards; a marketplace; the Panda Smart crop advisor rebuilt into the platform; an admin console; an App store where farmers and agrovets install apps; Farm records and Shop POS as installable apps. The App store, Farm records and Shop POS save to the browser until their backend ships. That backend is specified in `docs/backend_modules_and_records_spec.md`.

## 1. Standing commitment: UI/UX for every new feature

Whenever a feature is added to Ukulima Bora — whoever builds its backend, model or integration — Stephen owns its user-facing side on the web app and on the Capacitor Android app that loads it. That covers:

- information architecture and navigation: where the feature lives and how users reach it;
- screens, components and visual consistency in `apps/web`;
- every state: loading, empty, error, low balance, no permission, poor connection;
- copy in English and Kiswahili (scan and AgriBot wording is reviewed by Job; growth-facing copy by Emilio);
- accessibility (WCAG 2.1 AA), mobile-first layouts from 360 px up, low-bandwidth behaviour;
- the front-end implementation and its pull requests.

**What the feature owner provides before UI work starts**

1. A short brief: the problem, who it is for, acceptance criteria.
2. The API contract: endpoints, fields and error cases. Sample JSON is enough to start.
3. Any rules the UI must enforce: limits, prices, consent.

**What stays with the feature owner:** API, data models and migrations, AI models and prompts, payments, infrastructure and security. If a UI need depends on one of these, Stephen files a request with the owner instead of changing it.

**Definition of done for UI:** a feature's UI is done when its states, copy and accessibility checks have shipped, or have been explicitly deferred in the backlog.

## 2. Where UI/UX work happens

**Stephen works in**

- `apps/web/src/app/**` (pages), `apps/web/src/components/**`, `apps/web/src/app/globals.css`
- `apps/web/public/**` (images and assets), UI copy and strings
- Android launcher and splash assets in `apps/web/android`
- Design files (location in §7)

**Requested from the owner instead**

- `apps/api/**`, `infra/**`, CI, secrets and deploys, Android manifest and security settings — Wilson
- Payments and M-Pesa — Brian
- AI models, prompts, scan and AgriBot output — Job

The legacy Django templates in `apps/api/main_app/templates` are not part of this work.

## 3. Workstream A — Farm Records (new feature)

**Why.** Today a farmer can scan a leaf, chat with AgriBot, browse inputs and market prices, and keep a short profile. There is nowhere to keep what happens on the farm across a season. A simple record trail may give farmers a reason to come back (roadmap §7 asks for 10 farmers who return unprompted) and gives the Farm Health Score, crop recommendation and IoT work real data to build on. Both are hypotheses to validate, not facts.

**Starting point in the code**

- `FarmerProfile` holds `farm_name`, `farm_size_acres`, `county` and a free-text `products` field.
- Scan history exists (`ScanJob`, `CropScanLog`).
- There are no farm, plot or record tables yet. `docs/SYSTEM_DOCUMENTATION.md` §3.2 lists a planned `FarmPlot` entity (no migrations yet). Farm Records shares that model with crop recommendation and IoT instead of creating a parallel one.

**MVP scope — validated with farmers before anything is built**

1. **Farm and plots** — name, size, county; one or more plots.
2. **Crop cycle** — crop, plot, planting date, expected harvest, status.
3. **Activities** — planting; fertiliser, seed or pesticide applied (product, quantity, cost); weeding, irrigation, labour. Each with a date and an optional note or photo.
4. **Harvest and sales** — quantity, unit, price, optional buyer.
5. **Scan history on the crop cycle** — reuses existing scans.
6. **Season summary** — costs against income, plus a simple timeline.
7. **Export and share** — CSV or PDF for the farmer; sharing with a lender only through the existing lending-consent flow.

**UX principles:** a record in a few taps; large touch targets; icons plus short words; English/Kiswahili toggle; units always visible (acres, kg, KSh); undo for mistakes; works on small, low-cost phones; drafts survive a bad connection (full offline sync is a later phase).

**Not in the MVP:** sensor/IoT data, crop recommendations, USSD or SMS entry, marketplace listings created from a harvest, group or co-op accounts.

**Sequence.** Design runs alongside the roadmap's current priorities (reliability, farmer conversations, the thin slice — roadmap §7), so the first step needs no engineering time:

| Step | What | Needs |
|---|---|---|
| A0 Discovery and design | Validate the MVP list in the farmer conversations; user flows; wireframes; clickable prototype | Emilio (conversations); no engineering |
| A1 Contract | Define the data model and API (building on `FarmPlot`); consent and retention rules | Wilson, Brian, Job |
| A2 Build | Screens in `apps/web` against a stubbed API, then the real one | A1 done |
| A3 Pilot | A few farmers; fix; decide on offline sync and USSD/SMS entry | A2 done |

Engineering time is requested from Wilson when A1 starts.

## 4. Workstream B — UI/UX improvements to existing screens

Initial backlog from a review of the current web app.

| # | Area | Change | Needs from others |
|---|---|---|---|
| 1 | Scan results | Low-confidence handling and an "advisory only" note; readable disease names (raw labels such as `Corn___Northern_Leaf_Blight` can appear today); clearer progress, timeout and retry; friendlier errors | Job: wording and confidence thresholds |
| 2 | Trust and claims copy | Make every on-screen claim match what is live: disease count, support hours, USSD dial instructions, free-versus-paid wording. No farmer–buyer matching claims. Feeds the roadmap's public-claims audit | Job, Emilio |
| 3 | USSD demo | Make clear it is a demo that uses a sample number | Wilson: backend support for a demo-only mode |
| 4 | Search and lists | Debounced search, loading and empty states, pagination in inputs, market and directories | Wilson: paginated API responses |
| 5 | Consent and privacy | Clearer sign-up consent, a plain-language lending-consent explanation, a fuller privacy page | Brian, Job; Wilson: store consent |
| 6 | Design system | Shared tokens and components; split the 1,075-line `globals.css`; keep the shared KAMIS `PriceFinder` on the farmer market page; `next/image` in place of `<img>` where it helps | — |
| 7 | Accessibility and mobile | WCAG 2.1 AA audit; a pass at 360 px width | — |
| 8 | Kiswahili UI | UI labels are English-only today (AgriBot replies are bilingual) and there is no i18n setup; add a Kiswahili string set | Emilio, Job: translation review |
| 9 | Android app | Launcher and splash assets, camera flow, poor-connection message | Wilson: manifest and security settings |

## 5. How UI/UX work reaches the codebase

- **Branches.** Start from `Development` (the GitHub branch is capitalised; the roadmap writes `development`). This workstream: `feat/ui-ux-farm-records`. Larger items get their own short-lived branches, for example `feat/ui-scan-results`.
- **Pull requests.** One screen or feature slice per PR, into `Development`, with a short *why* (roadmap §4). At least one approving review; UI PRs are not self-merged. Only Wilson, or someone Wilson designates, merges `Development` into `main`.
- **Reviewers.** Wilson for front-end code; Emilio for growth-facing copy; Job for scan and AgriBot wording. The roadmap's review list has no UI/UX line yet (see §7).
- **Before every PR.** `npm run lint` and `npx tsc --noEmit` pass (baseline on 5 October 2026: no type errors, 0 ESLint errors, 6 warnings); checked at 360 px and on desktop; loading, empty and error states present; English and Kiswahili strings for any new text.
- **Stay inside `apps/web`.** A needed change to `apps/api`, `infra` or a dependency is requested from its owner, not bundled into a UI PR.
- **Progress.** Reported weekly at the Monday standup (roadmap §7).

## 6. What UI/UX needs from the team

- **Wilson:** API contracts with sample JSON for each new feature; paginated list endpoints; review of front-end PRs; the Farm Records data model, built on `FarmPlot`.
- **Job:** wording sign-off for scan and AgriBot output; decisions on claims.
- **Brian:** consent and retention rules for farm data; consent wording.
- **Emilio:** farmer conversations to validate Farm Records; Kiswahili copy review.

## 7. Team docs to update alongside this work

- `docs/project_status_and_roadmap.md` §2: record UI/UX ownership for Stephen. It currently lists Stephen as "Product / project manager and IoT lead".
- The same file, §4: add a UI/UX line to the review routing, and "a feature's done includes its UI states".
- Design files: add their location here (for example a shared Figma project) once it exists.

## 8. Questions to settle with owners

1. Who builds the Farm Records backend, and when? (Wilson)
2. What goes into the Farm Records MVP? Validate in farmer conversations (Emilio); the field specialist, once hired, reviews activity categories.
3. What consent and retention rules apply to records shared with lenders? (Brian, Job)

## 9. Built on `feat/ui-ux-farm-records`

Nothing is committed yet. Each area below becomes its own PR into `Development`.

**Portal shell and dashboards**

- One signed-in layout for every role. A sidebar is grouped by task, and apps with several pages open as dropdowns. A compact top bar shows the wallet. Below 1024 px the sidebar becomes a drawer.
- Signing in lands each role on a dashboard of highlights: farm health, wallet and free scans, recent scans for farmers; KPIs, 30-day charts and recent activity for admins; a Shop POS banner for agrovets.
- Density and type follow the compact retail-dashboard reference the team chose: smaller cards, Poppins headings, 14 px body text.

**Public site and marketplace**

- Home sections redone: trust bar, features, how-to, tool cards, USSD demo.
- Marketplace list with search, filters, sorting and pagination, product pages with an image zoom and a WhatsApp order button, and a seller directory. The same pages appear inside the farmer portal.

**Crop advisor**

- The Panda Smart recommender is rebuilt as part of the platform. A new Django app, `apps/api/recommend`, reimplements its Gaussian Naive Bayes model in plain Python from exported parameters, with no pickles. Its predictions were checked to match the original. On top of it: weather fill, English/Kiswahili, a crop library with photos, saved history and admin statistics. It runs on the public site and in the farmer portal.
- Credits: Panda Smart was built by Stephen Kingori, Rotich Kibet and Agnes Mwikali (Department of Computer Science, Karatina University; supervisor Dr Zablon Okari). Its data, `Crop_recommendation.csv` (2,200 rows, 22 crops), matches the public crop-recommendation dataset on Kaggle. Confirm the dataset licence, and the rights to the crop photos taken from the repository, before commercial use.

**Admin console**

- Dashboard, users (search, filter, suspend), marketplace moderation (hide a listing), lenders, revenue, crop advisor statistics, and an **App store** page that switches each app on or off and sets it free, paid once or paid monthly.

**App store and installable apps**

- Farmers and agrovets each have an App store. An installed app appears under **My apps** in the sidebar, as a dropdown when it has several pages. Pages of an app that is not installed show an install prompt. Paid apps confirm the price before charging the wallet.
- **Farm records** (farmers): fields, farm work with costs, sales, profit per field, season filter, CSV export. Pages: By field, Farm work, Sales, Fields.
- **Crop advisor** (farmers, installed by default): Get advice and Crop library.
- **Shop POS** (agrovets): a till that sells from the shop's own product list; cash with change, M-Pesa code or credit; discounts; one-off items; printable and WhatsApp receipts; sales history with takings, payment split, best sellers, voids and CSV export. Pages: New sale, Sales history.
- Backend contract for all three: `docs/backend_modules_and_records_spec.md`. Each feature switches from browser storage to the API with one environment flag.

**Code structure in `apps/web/src`**

- `features/<feature>/` holds each feature's API calls, types, components and CSS: marketplace, advisor, admin, market, farmer, modules, records, pos.
- `components/ui/` holds the shared building blocks: page header, stat cards, tabs, pagination, dialogs and charts.
- Route files in `app/` stay thin. To add an app, add one entry to `features/modules/registry.ts` and wrap its pages in `<ModuleGate>`.

**Backend changes on this branch (Wilson to review before merge)**

These were made outside §2's "requested from the owner" rule, at the product owner's request, so the screens above have real data.

- New app `apps/api/recommend` with a migration and tests.
- `AgencyProduct.is_hidden`, with migration `accounts/0004`, so admins can hide listings.
- New views: storefront (`store_views.py`), admin console (`admin_views.py`) and farmer overview (`farmer_views.py`), with their URLs.
- Settings: the `recommend` app, the `recommend` and `store` throttle scopes, and `SIMPLE_JWT["UPDATE_LAST_LOGIN"]`.
- 41 API tests pass and `makemigrations --check` is clean.

**Checks:** `tsc` passes with no errors. ESLint shows 0 errors and 2 earlier `<img>` warnings. `next build` builds all 56 routes. Flows were checked in a browser on desktop and at phone width.

**Still open:** farmer validation of Farm records (A0), using these screens as the prototype; the Workstream B items not yet covered.

## 10. Status

- [ ] Farm Records: MVP validated with farmers (the built screens serve as the prototype)
- [x] Farm Records: flows and screens (built as an installable app, browser storage for now)
- [x] Farm Records: data model and API contract written (`docs/backend_modules_and_records_spec.md` §3); agreement with Wilson pending
- [x] App store and Shop POS: screens and API contract written (same doc, §2 and §4)
- [ ] Backend for the App store, Farm records and Shop POS (Wilson, Brian)
- [x] Workstream B: design system split into feature CSS and shared components; marketplace pagination
- [x] Ukulima Bora name in the UI
- [ ] Design files location added to this doc
