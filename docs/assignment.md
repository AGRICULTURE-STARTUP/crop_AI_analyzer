# AgriScan Team Assignment and Integration Roadmap

**Document version:** 2.0
**Updated:** 30 July 2026
**Team size:** 4
**Planning horizon:** August–October 2026
**Product:** [agriscan.co.ke](https://agriscan.co.ke)

## 1. Current Position

AgriScan's Django platform is deployed on a Contabo VPS and available through the `agriscan.co.ke` domain. The product already includes crop-image diagnosis, AgriBot, farmer/buyer/agency roles, a marketplace foundation, wallets, and a Farm Health Score.

The next objective is to turn these parts into one universal digital agricultural system. The immediate work is:

1. Integrate Stephen Kingori's crop recommendation system.
2. Complete and verify production M-Pesa payments.
3. Build and test SMS/USSD access.
4. Implement technical and content SEO.
5. Design, procure, calibrate, and integrate NPK and soil-moisture sensors.
6. Make crop diagnosis and AgriBot advice use trusted sensor, weather, crop, and farm-history context.
7. Improve automated tests, security, monitoring, documentation, and field validation.



## 2. Team Structure


| Person              | Primary role                                    | Accountable for                                                                                      |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Job Nyaribari**   | Founder, Product and AI/Technical Lead          | Product decisions, architecture, AI diagnosis/advice, security, releases, partnerships               |
| **Ziro**            | Platform, Integrations and DevOps Lead          | USSD/SMS, M-Pesa engineering, Contabo operations, APIs, observability, data pipelines                |
| **Lynn**            | Agricultural Operations and Farmer Success Lead | Agronomic validation, farmer workflows, Kiswahili content, sensor field protocol, pilot readiness    |
| **Stephen Kingori** | Crop Recommendation and Project Management Lead | Recommender integration, model documentation/testing, delivery coordination, risks, status reporting |




### Working principle

Each workstream has one accountable owner. Major production changes require review by at least one other technical member, while agronomic claims require Lynn's review or external agronomist validation.

## 3. Individual Assignments



### 3.1 Job Nyaribari

**Primary responsibilities**

- Own product scope, system architecture, privacy, and release acceptance.
- Define how crop recommendation, sensor data, diagnosis, and AgriBot work together.
- Own AI image-diagnosis and context-aware advisory changes.
- Approve production database and API changes.
- Lead security reviews, model-risk policy, and agronomist escalation rules.
- Coordinate technical partnerships, M-Pesa production access, and IoT suppliers.
- Review and merge high-risk pull requests.

**Deliverables**

- Integration architecture and API contracts approved.
- AgriBot accepts validated crop, weather, sensor, and diagnosis context.
- AI recommendations show limitations and escalation guidance.
- Security and production-readiness checklist signed off.
- Release go/no-go decisions recorded.



### 3.2 Ziro

**Primary responsibilities**

- Complete M-Pesa STK, callback idempotency, reconciliation, and operational alerts.
- Implement Africa's Talking or selected provider's USSD and SMS webhooks.
- Own Contabo deployment, Nginx, TLS, backups, logs, monitoring, and rollback.
- Design and implement authenticated IoT telemetry ingestion with Job.
- Build data-quality checks, device health metrics, and sensor dashboards.
- Improve mobile/low-bandwidth behavior and integration tests.

**Deliverables**

- Production M-Pesa flow passes reconciliation tests.
- USSD MVP supports registration/identification, crop advice request, wallet/balance, and help.
- SMS sends confirmations, concise advice, alerts, and failure-safe messages.
- Telemetry API stores valid readings and quarantines invalid readings.
- Production monitoring, backups, and deployment runbook are current.



### 3.3 Lynn

**Primary responsibilities**

- Define farmer-friendly crop recommendation and sensor-data collection workflows.
- Review crop, soil, fertiliser, irrigation, and disease advice for safety and clarity.
- Develop English/Kiswahili content for web, AgriBot, SMS, and USSD.
- Define sensor placement, sampling, calibration, and field-observation forms with technical support.
- Prepare agronomist comparison criteria and farmer feedback tools.
- Work with Stephen to research, suggest, prototype, and test farmer-friendly UI/UX improvements.
- Lead pilot onboarding, support, and field-result interpretation when pilots begin.
- Identify cooperatives, extension officers, agrovets, and target farmer groups.

**Deliverables**

- Agronomic review checklist and escalation matrix.
- Sensor field protocol and data-collection forms.
- Approved English/Kiswahili USSD/SMS and recommendation copy.
- Crop-recommendation validation cases with expected agronomic reasoning.
- Prioritised UI/UX recommendations based on farmer needs, language, accessibility, and field feedback.
- Pilot playbook, training materials, and baseline/follow-up survey.



### 3.4 Stephen Kingori

**Primary responsibilities**

- Audit and document the existing Flask crop recommendation system, dataset, scaler, model, and 22 crop classes.
- Port prediction into AgriScan's Django architecture without loading unsafe or unverified user-supplied model files.
- Define request/response contracts and ensure exact feature ordering and units.
- Add validation ranges, missing-data handling, model versioning, and prediction logging.
- Create unit and integration tests for preprocessing, predictions, API errors, and regressions.
- Work with Lynn to validate model assumptions and farmer-facing explanations.
- Collaborate with Lynn on UI/UX research, wireframes, usability testing, and implementation recommendations across web, SMS, and USSD journeys.
- Maintain the project board, dependencies, risk register, weekly status, and delivery evidence.
- Coordinate code review and integration handoffs across all four team members.

**Deliverables**

- Versioned Django crop-recommendation service/API.
- Reproducible model artefact documentation and model card.
- Automated prediction test suite and baseline test dataset.
- Recommendation UI integrated with farmer profiles and optional trusted sensor/weather inputs.
- UI/UX improvement backlog and tested prototypes prepared jointly with Lynn.
- Weekly project status report with owners, blockers, risks, and next actions.



## 4. Workstream Ownership


| Workstream                       | Accountable | Responsible/support | Definition of done                                                                             |
| -------------------------------- | ----------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Product and architecture         | Job         | Stephen, Ziro, Lynn | Approved scope, interfaces, risks, and acceptance criteria                                     |
| Crop recommendation              | Stephen     | Job, Lynn           | Django integration tested, documented, versioned, and field-validation-ready                   |
| AI diagnosis and AgriBot context | Job         | Lynn, Ziro          | Advice uses authorised context and includes confidence/escalation behavior                     |
| M-Pesa production                | Ziro        | Job                 | Live STK/callback/reconciliation passes tests and monitoring is active                         |
| USSD/SMS                         | Ziro        | Lynn, Stephen       | Provider sandbox and production-ready flows pass internal UAT                                  |
| IoT devices and telemetry        | Ziro        | Job, Stephen, Lynn  | Calibrated pilot devices send attributable, validated readings                                 |
| Agronomy and field validation    | Lynn        | Stephen, Job        | Protocol approved; results traceable to cases and field observations                           |
| UI/UX research and improvement   | Lynn        | Stephen, Job, Ziro  | Farmer journeys are accessible, tested, prioritised, and translated into implementable changes |
| SEO and discoverability          | Stephen     | Job, Lynn           | Metadata, sitemap, robots, structured data, content plan, and analytics verified               |
| DevOps and reliability           | Ziro        | Job                 | Backups, alerts, TLS, logs, and rollback tested on Contabo                                     |
| Project management               | Stephen     | All                 | Board, milestones, dependencies, decisions, and risks updated weekly                           |
| Privacy and security             | Job         | Ziro, Stephen       | Threat review, consent controls, device security, and incident steps documented                |




## 5. Technical Integration Rules



### Crop recommendation

- Keep the original Flask repository as a reference; implement production functionality in Django.
- Preserve the model's seven-feature order: N, P, K, temperature, humidity, pH, rainfall.
- Document units, expected ranges, training-data limitations, and model/scaler versions.
- Never silently replace missing sensor values with random estimates.
- Distinguish measured, user-entered, weather-derived, and estimated values.
- Store recommendation inputs, source, model version, output, and timestamp for evaluation.
- Treat the recommendation as decision support, not a guaranteed planting instruction.



### IoT

- Start with a small, calibrated NPK and soil-moisture prototype before bulk procurement.
- Every reading must include device, farm/plot, timestamp, metric, value, unit, and quality status.
- Reject or quarantine implausible, stale, duplicated, or unauthenticated readings.
- Keep raw readings separate from derived recommendations.
- Allow an authorised person to mark faulty sensors and correct field metadata.
- Do not use low-cost NPK readings as laboratory-equivalent without comparative validation.



### AI advice

- AgriBot must know whether context is measured, estimated, or farmer-reported.
- High-risk pesticide, severe-disease, or low-confidence cases must advise consultation with an agronomist or extension officer.
- Advice changes must be testable against saved cases.



## 6.  Delivery Plan



### Sprint 1 — Baseline and interfaces


| Owner   | Tasks                                                                          | Exit evidence                        |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| Job     | Approve architecture, data flow, safety boundaries, and release criteria       | Architecture decision record         |
| Stephen | Model/dataset audit; model card draft; Django API design; project board        | Audit report, API contract, board    |
| Ziro    | Audit Contabo, M-Pesa, logs, backups, USSD/SMS providers                       | Gap report and provider decision     |
| Lynn    | Define agronomic validation cases, user wording, and sensor field requirements | Validation and field-protocol drafts |


**Milestone:** Interfaces and risks agreed before implementation.

### Sprint 2 — Crop recommendation integration


| Owner   | Tasks                                                                  | Exit evidence               |
| ------- | ---------------------------------------------------------------------- | --------------------------- |
| Stephen | Implement service, validation, model loading, logs, UI, and tests      | Passing test suite and demo |
| Job     | Review architecture/security; connect recommendation to farmer profile | Reviewed integration        |
| Lynn    | Review recommendation explanations and test cases                      | Agronomic sign-off notes    |
| Ziro    | Prepare deployment configuration and metrics                           | Staging observability       |


**Milestone:** Crop recommendation works on staging with traceable inputs and model version.

### Sprint 3 — Payments, SMS/USSD, and SEO


| Owner   | Tasks                                                                                      | Exit evidence                        |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| Ziro    | Finish M-Pesa reliability; implement SMS/USSD callbacks and flows                          | Reconciliation and UAT logs          |
| Stephen | Technical SEO: metadata, canonical URLs, sitemap, robots, schema, Search Console checklist | SEO audit and indexed-page checklist |
| Lynn    | Approve concise English/Kiswahili channel content                                          | Content sign-off                     |
| Job     | Review pricing, consent, security, and production release                                  | Release decision                     |


**Milestone:** Inclusive access and payment flows pass internal testing.

### Sprint 4 — IoT prototype


| Owner   | Tasks                                                                        | Exit evidence                   |
| ------- | ---------------------------------------------------------------------------- | ------------------------------- |
| Ziro    | Implement device registry, telemetry endpoint, validation, and dashboard     | Device-to-dashboard demo        |
| Stephen | Integrate trusted readings into recommendation input selection and add tests | Sensor-source integration tests |
| Lynn    | Run placement/calibration protocol and record reference observations         | Calibration report              |
| Job     | Review threat model, data model, and AI-context rules                        | IoT readiness review            |


**Milestone:** At least one prototype device securely sends validated NPK/moisture readings.

### Sprint 5 — Context-aware advice and end-to-end QA


| Owner   | Tasks                                                                       | Exit evidence                 |
| ------- | --------------------------------------------------------------------------- | ----------------------------- |
| Job     | Add validated sensor/recommendation context to AgriBot and diagnosis advice | Saved end-to-end cases        |
| Ziro    | Add alerts, retries, offline failure handling, and performance monitoring   | Reliability report            |
| Stephen | Coordinate regression testing and close integration defects                 | Test report and release notes |
| Lynn    | Evaluate usefulness, safety, and farmer clarity                             | Agronomic QA report           |


**Milestone:** A farmer journey works from field reading to recommendation, diagnosis, and advice.

### Sprint 6 — Pilot readiness and production release


| Owner   | Tasks                                                                   | Exit evidence          |
| ------- | ----------------------------------------------------------------------- | ---------------------- |
| Job     | Security review, release decision, partner/technical briefing           | Signed go/no-go        |
| Ziro    | Production deployment, rollback exercise, backup restore test           | Operations report      |
| Stephen | Documentation, handover, KPI baseline, and final project report         | Versioned release pack |
| Lynn    | Pilot training, support workflow, consent materials, and field schedule | Pilot-readiness pack   |


**Milestone:** Stable production release and approved small field pilot.

## 7. RACI Matrix

*R = Responsible, A = Accountable, C = Consulted, I = Informed*


| Deliverable                     | Job     | Ziro  | Lynn    | Stephen |
| ------------------------------- | ------- | ----- | ------- | ------- |
| Architecture and product scope  | **A/R** | C     | C       | C       |
| Crop recommendation integration | A       | C     | C       | **R**   |
| Recommender model validation    | C       | I     | **A/R** | R       |
| M-Pesa production               | A       | **R** | I       | I       |
| USSD/SMS                        | A       | **R** | C       | C       |
| IoT telemetry platform          | A       | **R** | C       | R       |
| Sensor field protocol           | C       | C     | **A/R** | C       |
| AgriBot contextual advice       | **A/R** | C     | R       | C       |
| SEO                             | A       | C     | C       | **R**   |
| Contabo operations              | A       | **R** | I       | I       |
| Farmer pilot                    | A       | C     | **R**   | C       |
| UI/UX research and improvement  | A       | C     | **R**   | **R**   |
| Project tracking and reporting  | A       | C     | C       | **R**   |
| Security and privacy            | **A/R** | R     | C       | C       |




## 8. Team Workflow

- **Monday:** 45-minute planning session; Stephen updates the board and dependencies.
- **During the week:** Work through feature branches and reviewed pull requests.
- **friday:** 45-minute demo, test evidence, risks, and next-sprint commitments.
- **Urgent production incident:** Ziro leads operations, Job owns product/security decisions, Stephen records actions, and Lynn reviews farmer-facing impact.
- **Decision log:** Architecture, model, pricing, data, and agronomic decisions are recorded in `docs/`.



### Definition of done

A task is complete only when:

1. Acceptance criteria are met.
2. Tests and relevant manual checks pass.
3. Security, privacy, and agronomic risks are addressed.
4. Documentation and environment configuration are updated.
5. Another team member reviews the change.
6. Production changes include monitoring and rollback steps.



## 9. Success Measures



### Product and engineering

- Crop recommendation integrated with documented model and passing regression tests.
- M-Pesa production transactions reconcile without duplicate credits.
- SMS/USSD priority journeys pass internal and representative-user testing.
- IoT prototype readings are authenticated, attributable, calibrated, and quality-flagged.
- AgriBot can use trusted field context without hiding data provenance.
- Contabo backup restoration and rollback are tested.
- `agriscan.co.ke` has valid metadata, sitemap, robots policy, analytics, and search-console setup.



### Agronomy and user value

- Recommendations are compared with agronomist-reviewed cases.
- Sensor readings are compared with reference measurements.
- Advice is understandable in English and Kiswahili.
- Uncertain or dangerous cases are escalated.
- Pilot farmers can complete the core journey with documented support needs.



### Delivery

- Weekly milestones, blockers, risks, and decisions are visible.
- No critical unresolved defect enters production.
- No workstream depends on only one undocumented team member.



## 10. Risk Register


| Risk                                                         | Impact | Mitigation                                                                  | Owner          |
| ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------- | -------------- |
| Crop model performs poorly outside its training distribution | High   | Input limits, model card, local validation, confidence/limitation messaging | Stephen + Lynn |
| Low-cost sensors produce unreliable readings                 | High   | Small procurement, calibration, quality flags, reference tests              | Lynn + Ziro    |
| M-Pesa duplicate or missed callbacks                         | High   | Idempotency, atomic transactions, reconciliation, alerts                    | Ziro           |
| USSD provider or shortcode delays                            | Medium | Start provider process early; maintain SMS and web fallbacks                | Ziro           |
| AI advice causes unsafe action                               | High   | Guardrails, approved content, escalation, audit logs                        | Job + Lynn     |
| Farmer data or device credentials are exposed                | High   | Least privilege, secret rotation, encryption, consent, incident plan        | Job + Ziro     |
| Scope exceeds four-person capacity                           | High   | Sprint limits, one accountable owner, defer non-critical features           | Stephen + Job  |
| Production outage                                            | High   | Monitoring, backups, restore tests, rollback runbook                        | Ziro           |




## 11. Immediate Actions


| Priority | Action                                                                                           | Owner       |
| -------- | ------------------------------------------------------------------------------------------------ | ----------- |
| 1        | Onboard Stephen to AgriScan repositories, Contabo architecture, board, and contribution workflow | Job         |
| 2        | Produce crop-recommendation model/data audit and Django integration contract                     | Stephen     |
| 3        | Confirm current M-Pesa production gaps and callback behavior                                     | Ziro        |
| 4        | Select SMS/USSD provider and document setup dependencies                                         | Ziro        |
| 5        | Draft crop recommendation and sensor validation protocol                                         | Lynn        |
| 6        | Approve unified architecture for recommendation, IoT, diagnosis, and AgriBot                     | Job         |
| 7        | Create SEO baseline and Search Console checklist for `agriscan.co.ke`                            | Stephen     |
| 8        | Obtain quotations for a small NPK/moisture sensor prototype, not bulk hardware                   | Ziro + Lynn |


---

**Document owner:** Job Nyaribari
**Project coordination:** Stephen Kingori
**Contributors:** Ziro and Lynn