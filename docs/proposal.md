# Grant Proposal: Ukulima Bora — Universal Digital Agricultural Intelligence Platform

**Version:** 2.0
**Updated:** 30 July 2026

## Executive Summary

Smallholder farmers frequently choose crops, apply inputs, irrigate, and respond to crop stress without timely soil data or agronomic support. Ukulima Bora addresses this problem through one connected platform for crop recommendation, IoT field monitoring, AI crop diagnosis, multilingual advice, market access, mobile money, and consent-based farm records.

The core Django application is deployed on a Contabo VPS at **[ukulimabora.co.ke](https://ukulimabora.co.ke)**. The next stage will integrate Stephen Kingori’s 22-crop recommendation system, complete M-Pesa and SMS/USSD access, implement SEO, and prototype an affordable IoT layer for NPK and soil-moisture data. These capabilities will allow AgriBot to give advice based not only on a photograph or question, but also on measured field conditions and farm history.

Ukulima Bora seeks **USD 75,000** to complete integration, procure and validate IoT hardware, conduct agronomist-supervised field pilots, improve accessibility, and prepare the platform for responsible scale over 18 months.

## Organization and Team

Ukulima Bora is being developed by a four-person multidisciplinary team:

- **Job Nyaribari — Founder, Product and AI/Technical Lead:** product direction, architecture, AI diagnosis, security, and partnerships.
- **Ziro — Platform and Integrations Lead:** backend integrations, USSD/SMS, DevOps, observability, and data services.
- **Lynn — Agricultural Operations and Farmer Success Lead:** agronomic content, field protocols, farmer training, and validation.
- **Stephen Kingori — Crop Recommendation and Project Management Lead:** crop-recommendation product ownership, model integration, delivery tracking, technical documentation, and cross-team coordination.

Stephen joins Ukulima Bora with an existing Flask and Gaussian Naive Bayes crop recommendation system. Its integration provides a tested starting point while the team validates assumptions and adapts the model to local field conditions.

## Problem or Need

Farmers face six connected gaps:

1. **Pre-planting uncertainty:** Soil and climate information is rarely converted into an understandable crop choice.
2. **Limited field visibility:** NPK, moisture, and other soil conditions are not measured continuously on most small farms.
3. **Delayed diagnosis:** Extension officers cannot reach every farmer when symptoms first appear.
4. **Fragmented advice:** Image diagnosis, weather, soil readings, and treatment guidance are often disconnected.
5. **Digital exclusion:** Smartphone-only products exclude feature-phone and low-connectivity users.
6. **Market and finance barriers:** Farmers lack transparent market links and verifiable, consent-based production records.

The result is unsuitable crop selection, delayed intervention, avoidable input use, low productivity, and weak financial resilience.

## Proposed Solution

Ukulima Bora supports the farming lifecycle through:

- **Crop recommendation:** Uses N, P, K, pH, temperature, humidity, and rainfall to suggest suitable crops.
- **IoT monitoring:** Collects NPK and soil-moisture readings from field sensors, with room for temperature, humidity, pH, and other devices.
- **AI crop diagnosis:** Analyses leaf photographs and combines results with field context.
- **AgriBot advice:** Delivers practical English/Kiswahili guidance grounded in trusted agricultural content, weather, sensor readings, and farm history.
- **Market prices and inputs:** Shows latest KAMIS crop prices and connects farmers to agricultural input suppliers. Does not match farmers to produce buyers.
- **Payments and inclusion:** Uses M-Pesa and planned SMS/USSD channels.
- **Farm intelligence:** Builds a farmer-controlled history and Farm Health Score for support and responsible partner services.

The platform supports, but does not replace, qualified agronomists or extension officers. Low-confidence and high-risk cases will be escalated.

## Goals and Objectives

**Goal:** Improve productivity and financial resilience by making field intelligence and agronomic decision support affordable and accessible.

### 18-month objectives

1. Integrate crop recommendation into Ukulima Bora and validate it against agronomist-reviewed Kenyan cases within four months.
2. Complete production M-Pesa, SMS, and USSD flows and test them with representative users within six months.
3. Prototype, calibrate, and field-test NPK and soil-moisture telemetry on at least 20 plots within nine months.
4. Onboard up to 10,000 farmers and facilitate 50,000 crop scans or recommendations within 18 months, subject to pilot evidence and partner capacity.
5. Establish measurable baselines for recommendation usefulness, diagnostic agreement, response time, input use, and farmer outcomes.

## Implementation Strategy

| Phase | Timeline | Key activities | Lead roles |
|---|---|---|---|
| **1. Integration and stabilisation** | Months 1–3 | Merge crop recommendation into Django; finish production payments; implement SEO; improve tests, monitoring, and security | Job, Stephen, Ziro |
| **2. Inclusive access and IoT prototype** | Months 3–6 | Deliver SMS/USSD; procure sensors; define device identity and telemetry API; calibrate NPK/moisture devices | Ziro, Stephen, Lynn |
| **3. Field validation** | Months 6–12 | Deploy monitored plots; compare AI advice with agronomist assessments; improve models and Kiswahili content | Lynn, Job, Stephen |
| **4. Scale and partnerships** | Months 12–18 | Expand farmer, agency, cooperative, and finance partnerships based on validated evidence | All |

## Budget and Justification

| Expense category | Estimated cost | Justification |
|---|---:|---|
| Software development and infrastructure | $22,000 | Integration work, AI/LLM services, VPS scaling, backups, observability, security, and developer support |
| IoT hardware and connectivity | $16,000 | NPK and moisture sensors, controllers/gateways, enclosures, solar/power components, SIM/data, spares, and installation |
| Field validation and agronomy | $14,000 | Agronomist review, calibration, plot visits, farmer training, transport, and data collection |
| Farmer access and communications | $8,000 | SMS/USSD setup and usage, Kiswahili content, support materials, and low-bandwidth testing |
| Outreach and partnerships | $8,000 | Cooperative engagement, demonstrations, onboarding, and stakeholder workshops |
| Project management, legal, and contingency | $7,000 | Coordination, data-protection work, contracts, reporting, and risk reserve |
| **Total requested** | **$75,000** | |

Final expenditure will follow supplier quotations, pilot design, and funder requirements.

## Monitoring, Evaluation, and Learning

The project will track:

- Crop-recommendation agreement with agronomists and farmer-observed outcomes.
- Sensor completeness, calibration error, uptime, and failed-reading rates.
- Crop diagnosis confidence and agreement with validated labels.
- Time from farmer request to actionable advice.
- Active farmers, scans, recommendations, AgriBot sessions, SMS/USSD sessions, and retention.
- Marketplace connections and completed transactions.
- Reported changes in input use, crop loss, yield, and farmer confidence.
- Consent rates, data-access events, incidents, and escalations.

Targets will be revised after baseline data is collected; model accuracy claims will not substitute for field validation.

## Sustainability

Potential revenue includes affordable scan and advisory microtransactions, agency subscriptions, marketplace fees, cooperative monitoring packages, IoT service plans, and consent-based B2B APIs. Free trials and sponsored access can protect inclusion while recurring institutional services support long-term operations.

## Key Risks and Mitigation

- **Sensor inaccuracy:** Calibrate against reference tests and flag implausible readings.
- **AI misdiagnosis:** Show confidence, retain audit trails, and escalate uncertain cases.
- **Connectivity gaps:** Provide SMS/USSD and store-and-forward IoT designs.
- **Farmer-data misuse:** Apply explicit consent, role-based access, encryption, and audit logging.
- **Integration complexity:** Use documented APIs, staged rollouts, automated tests, and clear ownership.
- **Overambitious adoption targets:** Gate expansion on pilot evidence and operational capacity.

## Contact

**Job Nyaribari**
**Phone:** +254 758 503819
**Email:** [jobnyaribari808@gmail.com](mailto:jobnyaribari808@gmail.com)
**Website:** [ukulimabora.co.ke](https://ukulimabora.co.ke)
