# AgriScan Team Assignment & 6-Week Launch Plan

**Document version:** 1.2  
**Plan period:** 13 July 2026 → 27 August 2026 (6 weeks)  
**Objective:** Complete remaining **technical** product work, deploy to production VPS, and prepare (but not yet execute) the farmer pilot.

---

## 1. Executive Summary

AgriScan is entering a **technical launch sprint**. The core platform (AI crop diagnosis, AgriBot, marketplace, Farm Health Score, sandbox M-Pesa) is built. This 6-week period focuses on what the team can realistically deliver now:

1. **M-Pesa production integration**
2. **Contabo VPS deployment** (production-ready hosting)
3. **USSD/SMS channels** for feature-phone access
4. **Product refinement** for stable deployment

**Explicitly out of scope for this sprint** (deferred to Phase 2):

- **Farmer contact, recruitment, field demos, and live pilot** — requires more lead time for trust-building, logistics, and seasonal/location access
- **IoT edge implementation** — hardware procurement, field deployment, and telemetry integration need a dedicated phase after the core platform is live

Lynn’s work this sprint is **desk-based preparation** (research, content, pilot playbooks) so field activities can start immediately once the product is deployed.


| Person            | Role                                        | Department                                   |
| ----------------- | ------------------------------------------- | -------------------------------------------- |
| **Job Nyaribari** | Founder, Product & Technical Lead           | Engineering & Product                        |
| **Ziro**          | Technical Co-Lead (Integrations & Platform) | Engineering & Data                           |
| **Lynn**          | Field & Agricultural Operations Lead        | Field Research & Farmer Success (prep phase) |


---

## 2. Scope: In Sprint vs Deferred


| Workstream                        | This sprint (6 weeks)              | Deferred (Phase 2+)        |
| --------------------------------- | ---------------------------------- | -------------------------- |
| M-Pesa production                 | Complete & test on VPS             | —                          |
| Contabo VPS deploy                | Complete                           | —                          |
| USSD/SMS                          | Build & internal QA                | Farmer-facing UAT in field |
| Product refinement                | UX, security, performance          | —                          |
| Lynn: desk research & content     | Yes                                | —                          |
| Lynn: farmer contact & interviews | —                                  | Phase 2                    |
| Lynn: field training & pilot      | —                                  | Phase 2                    |
| IoT edge intelligence             | Architecture notes only (optional) | Full implementation        |
| Live farmer pilot                 | —                                  | Phase 2 (post-deployment)  |


---

## 3. Why Each Person Matters

### 3.1 Job — Founder, Product & Technical Lead

**Strengths:** Deep technical proficiency, original product vision, AI/ML ownership, architecture authority.

**Value this sprint:**

- Sets technical direction and owns hard problems (AI pipeline, scoring, security).
- Leads M-Pesa production go-live and VPS architecture.
- Makes scope and launch-readiness decisions.
- Ensures the platform is stable before any farmer touches it.

---

### 3.2 Ziro — Technical Co-Lead (Integrations & Platform)

**Strengths:** Development experience, actuarial science (quantitative modeling, risk metrics).

**Value this sprint:**

- Owns USSD/SMS and Contabo DevOps so Job can focus on core backend and AI.
- Hardens M-Pesa flows and builds internal analytics/KPI tooling.
- Validates Farm Health Score logic with structured test data.

---

### 3.3 Lynn — Field & Agricultural Operations Lead (AGED)

**Strengths:** Agricultural education and extension—farmer communication, agronomic context, extension methodology.

**Value this sprint (prep phase, no field contact required):**

- Researches priority crops, diseases, and farmer pain points from published/extension sources.
- Prepares Kiswahili advisory content for AgriBot before farmers are involved.
- Drafts pilot playbook, training materials, and partnership target list for Phase 2.
- Ensures the product messaging reflects real agricultural needs when field work begins.

**Phase 2 (after this sprint):** Farmer recruitment, field demos, cooperative partnerships, impact surveys.

---

## 4. Department Structure

```
                    ┌─────────────────────────┐
                    │   Job (Founder / Lead)   │
                    │  Product · AI · Strategy │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
   ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐
   │  Engineering   │  │  Engineering   │  │  Field & Farmer Success  │
   │  (Job — lead)  │  │  (Ziro)        │  │  (Lynn — prep only)      │
   │                │  │                │  │                          │
   │ AI/ML core     │  │ USSD/SMS       │  │ Desk research            │
   │ Architecture   │  │ DevOps/VPS     │  │ Kiswahili content        │
   │ M-Pesa (lead)  │  │ QA & APIs      │  │ Pilot playbook (draft)   │
   │ Security/RBAC  │  │ Analytics/KPIs │  │ Training materials       │
   │ Farm Score     │  │ M-Pesa QA      │  │ Partnership research     │
   └────────────────┘  └────────────────┘  └────────────────────────┘

   Phase 2 (post Week 6): IoT implementation · Live farmer pilot · Field partnerships
```

---

## 5. Individual Responsibilities

### 5.1 Job Nyaribari — Founder & Technical Lead


| Area           | Responsibilities                                                                    |
| -------------- | ----------------------------------------------------------------------------------- |
| **Product**    | Sprint priorities, acceptance criteria, feature freeze for deployment               |
| **AI/ML**      | Crop model inference, gatekeeper tuning, scan pipeline stability                    |
| **Backend**    | Core Django views, wallet logic, partner lending API, security hardening            |
| **M-Pesa**     | Production Daraja credentials, go-live checklist, callback reliability (lead owner) |
| **Deployment** | Contabo VPS architecture (PostgreSQL, Gunicorn, Nginx, SSL), production env vars    |
| **Leadership** | Weekly standups, blocker resolution, technical demo readiness                       |


**Key deliverables by end of Week 6:**

- Production M-Pesa live on Contabo VPS
- AI scan + AgriBot stable on production infrastructure
- Deployment runbook and security checklist complete
- Technical go/no-go for Phase 2 farmer pilot

---

### 5.2 Ziro — Technical Co-Lead


| Area          | Responsibilities                                                                |
| ------------- | ------------------------------------------------------------------------------- |
| **USSD/SMS**  | Africa’s Talking (or equivalent): menu flows, balance checks, advisory triggers |
| **DevOps**    | Contabo VPS: Docker, Nginx, Let’s Encrypt, backups, monitoring                  |
| **M-Pesa**    | Sandbox → production testing, STK push QA, transaction reconciliation           |
| **APIs**      | REST endpoints for USSD callbacks and SMS webhooks                              |
| **QA**        | Integration test checklist; internal regression before each release             |
| **Analytics** | Admin KPI views (scans, top-ups, USSD sessions), Farm Health Score test reports |
| **Frontend**  | Mobile UX polish, wallet modal, low-bandwidth optimizations                     |


**Key deliverables by end of Week 6:**

- USSD menu MVP (welcome, balance check, help, basic advisory trigger)
- SMS notifications for wallet events (top-up confirmation, low balance)
- Contabo production environment with deploy runbook
- Internal UAT sign-off on all payment and USSD flows

---

### 5.3 Lynn — Field & Agricultural Operations Lead (Prep Phase)


| Area                     | Responsibilities                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Desk research**        | Document top farmer pain points from KALRO, extension manuals, academic sources          |
| **Crop prioritization**  | Rank crops/diseases for future pilot using published prevalence data                     |
| **Extension content**    | Curate Kiswahili/English advisory snippets for AgriBot RAG (no live interviews yet)      |
| **Pilot planning**       | Draft pilot county/ward criteria, farmer profile template, outreach timeline for Phase 2 |
| **Training materials**   | Draft Kiswahili one-pager and demo script (for use when field work starts)               |
| **Partnership research** | List target cooperatives, agrovets, extension offices — contact in Phase 2               |
| **Messaging review**     | Review in-app copy and error messages for farmer clarity                                 |


**Key deliverables by end of Week 6:**

- Desk research summary (`docs/field_research_prep.md`)
- 15+ AgriBot Q&A pairs in Kiswahili (sourced from extension materials)
- Pilot playbook draft (`docs/pilot_playbook_draft.md`) — ready to execute in Phase 2
- Partnership target list (names/locations only; no outreach required this sprint)

**Not in this sprint:** Farmer calls, field visits, live interviews, cooperative meetings, baseline surveys.

---

## 6. Remaining Technical Scope


| Workstream             | Current state          | Target (Week 6)                                  | Primary     | Support |
| ---------------------- | ---------------------- | ------------------------------------------------ | ----------- | ------- |
| **M-Pesa**             | Sandbox STK + callback | Production Daraja on VPS                         | Job         | Ziro    |
| **VPS (Contabo)**      | Docker exists          | Production: Nginx, SSL, PostgreSQL, backups      | Ziro        | Job     |
| **USSD/SMS**           | Planned                | MVP built; internal team testing                 | Ziro        | Job     |
| **Product refinement** | Core built             | Stable UX, Kiswahili copy, clear errors          | Job         | Lynn    |
| **IoT edge**           | Roadmap only           | **Deferred** — optional 1-page architecture note | —           | —       |
| **Farmer pilot**       | Not started            | **Deferred** — playbook ready only               | Lynn (prep) | Job     |


---

## 7. Six-Week Timeline

**Cadence:**

- **Weekly:** 60-min sprint review + planning (Mondays)
- **Definition of Done:** Code merged, tested on staging/production VPS, documented in runbook

---

### Week 1 — Kickoff & Foundations

**13 Jul – 19 Jul 2026**


| Track                   | Owner | Tasks                                                                    | Exit criteria                             |
| ----------------------- | ----- | ------------------------------------------------------------------------ | ----------------------------------------- |
| Team setup              | Job   | Kickoff; repo access; GitHub project board; lock sprint scope            | Board live; deferred items marked Phase 2 |
| M-Pesa audit            | Job   | Review `mpesa_utils.py`, callback flow, env vars; production gap list    | Gap checklist in `docs/`                  |
| VPS planning            | Ziro  | Contabo account, domain DNS, server sizing, Docker compose draft         | Server provisioned                        |
| USSD/SMS research       | Ziro  | Compare Africa’s Talking vs Safaricom; draft USSD menu tree              | Provider chosen; menu v0.1                |
| Desk research framework | Lynn  | Select target county criteria; compile sources (KALRO, extension guides) | Research outline approved                 |
| Content audit           | Lynn  | List crops/diseases to prioritize from published data                    | Priority crop list (top 5)                |


**Week 1 milestone:** Infrastructure plan locked; M-Pesa gaps documented; Lynn’s research framework ready.

---

### Week 2 — Staging Build

**20 Jul – 26 Jul 2026**


| Track                    | Owner | Tasks                                                 | Exit criteria                             |
| ------------------------ | ----- | ----------------------------------------------------- | ----------------------------------------- |
| M-Pesa sandbox hardening | Ziro  | End-to-end STK test; idempotent callback; edge cases  | 10 successful test top-ups                |
| Contabo staging deploy   | Ziro  | Django + PostgreSQL on VPS; Nginx + SSL               | Staging URL accessible                    |
| AI/UX polish             | Job   | Gatekeeper tuning; scan errors; wallet flow           | ≥90% scan success on test set             |
| USSD skeleton            | Ziro  | Webhook + basic menu (welcome, balance, help)         | USSD callable on sandbox                  |
| Desk research            | Lynn  | Summarize top 5 farmer pain points from literature    | Draft in `docs/field_research_prep.md`    |
| Kiswahili content        | Lynn  | 10 FAQ pairs from extension sources                   | Shared with Job for RAG ingest            |
| Pilot playbook outline   | Lynn  | Farmer profile template, outreach steps (for Phase 2) | Outline in `docs/pilot_playbook_draft.md` |


**Week 2 milestone:** Staging live; USSD skeleton working; desk research draft complete.

---

### Week 3 — Integration Sprint

**27 Jul – 2 Aug 2026**


| Track                    | Owner | Tasks                                                    | Exit criteria                   |
| ------------------------ | ----- | -------------------------------------------------------- | ------------------------------- |
| M-Pesa production prep   | Job   | Production Daraja keys; env config for live API          | Credentials secured             |
| M-Pesa production test   | Ziro  | Live STK on VPS (small amounts); callback verified       | 3 successful production top-ups |
| USSD flows               | Ziro  | Phone lookup, balance check, SMS advisory trigger        | 3 flows pass internal QA        |
| SMS notifications        | Ziro  | Top-up confirmation, low-balance alert templates         | SMS sending verified            |
| AgriBot content ingest   | Job   | Add Lynn’s FAQ content to ChromaDB                       | Bot answers test questions      |
| Training materials draft | Lynn  | Kiswahili one-pager + demo script (for future field use) | Draft ready for review          |
| Partnership target list  | Lynn  | Research 5–10 cooperatives/agrovets (no contact yet)     | List in pilot playbook          |
| Marketplace check        | Job   | Buyer/agency registration smoke test                     | Roles work end-to-end           |


**Week 3 milestone:** Production M-Pesa on VPS; USSD MVP; SMS live; content ingested.

---

### Week 4 — Hardening & Internal QA

**3 Aug – 9 Aug 2026**


| Track                 | Owner       | Tasks                                              | Exit criteria                 |
| --------------------- | ----------- | -------------------------------------------------- | ----------------------------- |
| Security pass         | Job         | HTTPS cookies, rate limits, secrets audit, RBAC    | Security checklist signed off |
| Performance           | Job         | Gunicorn workers, CDN/static, DB indexes           | p95 scan latency <3s on VPS   |
| Monitoring            | Ziro        | Uptime check, error logging, backup cron           | Alerts configured             |
| USSD/SMS internal UAT | Ziro + Lynn | Team tests all flows on feature phones (team only) | UAT log; P1 issues filed      |
| Copy review           | Lynn        | Review farmer-facing messages in app, USSD, SMS    | Copy feedback merged          |
| Farm Health Score QA  | Ziro        | Test scoring with synthetic user data              | Score report documented       |
| Deploy runbook        | Ziro        | Step-by-step production deploy + rollback          | `docs/deploy_runbook.md`      |


**Week 4 milestone:** Production-hardened VPS; internal UAT complete; runbook written.

---

### Week 5 — Production Go-Live

**10 Aug – 16 Aug 2026**


| Track                   | Owner      | Tasks                                              | Exit criteria            |
| ----------------------- | ---------- | -------------------------------------------------- | ------------------------ |
| Production deploy       | Job        | Feature freeze; production cutover; smoke tests    | Production URL live      |
| Bug triage              | Ziro       | P0/P1 fixes within 24–48h                          | Zero open P0 bugs        |
| M-Pesa monitoring       | Ziro       | Daily reconciliation: `MpesaTransaction` vs wallet | No orphan transactions   |
| Soak testing            | Job + Ziro | Team runs scans, chats, top-ups, USSD for 3+ days  | Stability log maintained |
| KPI dashboard           | Ziro       | Admin metrics: scans, top-ups, USSD sessions       | Dashboard accessible     |
| Pilot playbook finalize | Lynn       | Complete playbook for Phase 2 field launch         | Playbook v1 ready        |
| Mid-sprint review       | All        | Retrospective: on track for technical launch?      | Action items for Week 6  |


**Week 5 targets (internal/team testing only):**

- ≥20 crop scans (team test accounts)
- ≥5 wallet top-ups (production M-Pesa)
- ≥10 AgriBot conversations
- USSD menu fully walkable by team

**Week 5 milestone:** Production platform live and stable; pilot playbook ready for Phase 2.

---

### Week 6 — Documentation & Phase 2 Handoff

**17 Aug – 27 Aug 2026** *(includes buffer to 27 Aug)*


| Track                     | Owner      | Tasks                                                         | Exit criteria               |
| ------------------------- | ---------- | ------------------------------------------------------------- | --------------------------- |
| Bug fixes                 | Job + Ziro | Resolve remaining P1/P2 from soak test                        | Release notes published     |
| Farm Health Score review  | Job + Ziro | Scoring validation report for partner conversations           | Report in `docs/`           |
| USSD v1.1                 | Ziro       | Polish menu copy; add help text improvements                  | UX improvements shipped     |
| Documentation             | Ziro       | API docs, env vars guide, ops checklist                       | Docs complete               |
| Research summary          | Lynn       | Finalize `field_research_prep.md`                             | Research doc complete       |
| Phase 2 plan              | Lynn + Job | Farmer outreach timeline, recruitment targets, field schedule | `docs/phase2_pilot_plan.md` |
| Technical launch decision | Job        | Go/no-go: platform ready for farmer pilot                     | Decision documented         |


**Week 6 milestone:** Technical launch complete; Phase 2 farmer pilot plan approved; team ready for field work.

---

## 8. RACI Matrix (This Sprint)


| Deliverable                | Job     | Ziro  | Lynn          |
| -------------------------- | ------- | ----- | ------------- |
| Production M-Pesa          | **A/R** | R     | I             |
| Contabo VPS production     | A       | **R** | I             |
| USSD/SMS channels          | A       | **R** | C             |
| AI/ML pipeline             | **A/R** | C     | I             |
| Farm Health Score          | **A/R** | R     | I             |
| Desk agricultural research | C       | I     | **A/R**       |
| Kiswahili advisory content | C       | I     | **A/R**       |
| Pilot playbook (draft)     | C       | I     | **A/R**       |
| Internal KPI dashboard     | A       | **R** | I             |
| IoT implementation         | —       | —     | — *(Phase 2)* |
| Farmer contact & pilot     | —       | —     | — *(Phase 2)* |


*R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## 9. Communication & Tools


| Tool                          | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| **GitHub**                    | Code, issues, project board, PR reviews           |
| **WhatsApp group**            | Weekly updates, blockers                          |
| **Google Docs/Sheets**        | Lynn’s research, pilot playbook, partnership list |
| **Weekly Monday call**        | Sprint planning and demo                          |
| **Shared** `docs/` **folder** | Runbooks, research, Phase 2 plans                 |


---

## 10. Risk Register & Mitigations


| Risk                               | Likelihood | Impact | Mitigation                                                   | Owner      |
| ---------------------------------- | ---------- | ------ | ------------------------------------------------------------ | ---------- |
| M-Pesa production approval delayed | Medium     | High   | Start application Week 1; sandbox fallback                   | Job        |
| USSD provider setup delays         | Medium     | Medium | Sign up Week 1; parallel SMS-only fallback                   | Ziro       |
| VPS downtime                       | Low        | High   | Backups, monitoring, staging parity                          | Ziro       |
| Scope creep (IoT/farmer pilot)     | High       | High   | This document; Phase 2 backlog only                          | Job        |
| Team bandwidth (exams/other)       | Medium     | Medium | Weekly scope lock; defer non-critical items                  | Job        |
| AI misdiagnosis                    | Medium     | High   | Disclaimer copy; extension-officer prompt before field pilot | Job + Lynn |


---

## 11. Success Criteria (End of Week 6)

### Product (must have)

- [ ] AgriScan running on Contabo VPS with HTTPS and PostgreSQL
- [ ] Production M-Pesa wallet top-ups working
- [ ] USSD MVP + SMS notifications built and internally tested
- [ ] No critical (P0) open bugs
- [ ] Deploy runbook and security checklist complete

### Preparation (must have)

- [ ] Desk research summary complete (`docs/field_research_prep.md`)
- [ ] Pilot playbook draft ready (`docs/pilot_playbook_draft.md`)
- [ ] 15+ Kiswahili AgriBot Q&A pairs ingested
- [ ] Phase 2 farmer pilot plan documented (`docs/phase2_pilot_plan.md`)

### Explicitly not required this sprint

- ~~Farmer interviews or field contact~~
- ~~Live farmer pilot or training sessions~~
- ~~IoT device deployment or telemetry ingestion~~
- ~~Cooperative partnership meetings~~
- ~~Baseline/follow-up farmer surveys~~

---

## 12. Phase 2 — What Starts After Week 6


| Workstream                           | Timeline (indicative)          | Owners                     |
| ------------------------------------ | ------------------------------ | -------------------------- |
| **Farmer outreach & recruitment**    | Weeks 7–10                     | Lynn (lead), Job (support) |
| **Field demos & training**           | Weeks 8–12                     | Lynn                       |
| **Live pilot (30–50 farmers)**       | Weeks 9–14                     | Lynn + all                 |
| **Cooperative/agrovet partnerships** | Weeks 7–12                     | Lynn                       |
| **Farmer impact surveys**            | Start of pilot + 6 weeks after | Lynn                       |
| **IoT architecture & procurement**   | Weeks 7–9                      | Job                        |
| **IoT edge prototype & field test**  | Weeks 10–16                    | Job + Ziro                 |
| **Expanded pilot scale-up**          | Month 4+                       | All                        |


---

## 13. Immediate Next Actions (This Week)


| #   | Action                                                | Owner | Due    |
| --- | ----------------------------------------------------- | ----- | ------ |
| 1   | Schedule 90-min team kickoff; agree on deferred scope | Job   | 13 Jul |
| 2   | Create GitHub project board (technical items only)    | Job   | 15 Jul |
| 3   | Provision Contabo VPS + domain DNS                    | Ziro  | 17 Jul |
| 4   | M-Pesa production application / credential check      | Job   | 17 Jul |
| 5   | USSD provider signup (Africa’s Talking)               | Ziro  | 17 Jul |
| 6   | Start desk research outline + crop priority list      | Lynn  | 17 Jul |
| 7   | Mark IoT and farmer pilot issues as Phase 2 on board  | Job   | 15 Jul |


---

*AgriScan — build the platform first, then take it to the field.*

**Document :** Job Nyaribari  
**Contributors:** Ziro, Lynn  
**Last updated:** 10 July 2026 (v1.2 — sprint starts 13 July; farmer contact & IoT deferred)