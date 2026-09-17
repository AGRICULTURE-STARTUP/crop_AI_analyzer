
# Concept Note: AgriScan

**Document version:** 2.0
**Updated:** 30 July 2026

## 1. Project Title

**AgriScan: A Universal AI, IoT, Market, and Financial Platform for Smallholder Agriculture**

## 2. Background and Problem Statement

Smallholder farmers in Kenya and across East Africa make high-impact decisions with incomplete information. They may not know which crop best matches their soil, discover crop stress or disease too late, or lack timely access to an agronomist. Most farms also lack continuous records of soil nutrients, moisture, weather, crop health, and interventions.

These information gaps contribute to unsuitable crop selection, delayed treatment, unnecessary input costs, low yields, weak market access, and exclusion from formal finance. Existing agricultural tools usually solve only one part of the problem and often require smartphones, reliable internet, or expensive precision-agriculture equipment.

## 3. Proposed Solution

AgriScan is a mobile-first digital agricultural platform that connects the full farming cycle:

1. **Plan:** Recommend suitable crops using nitrogen, phosphorus, potassium, pH, temperature, humidity, and rainfall.
2. **Monitor:** Collect field data from IoT sensors, beginning with NPK and soil-moisture measurements.
3. **Diagnose:** Analyse crop images and field conditions to identify disease, stress, and likely contributing factors.
4. **Advise:** Provide practical English/Kiswahili recommendations through AgriBot, informed by crop, sensor, weather, and scan history.
5. **Act and transact:** Connect farmers to buyers and trusted input suppliers and support low-cost payments through M-Pesa.
6. **Build a farm record:** Maintain a consent-based digital farm profile and Farm Health Score for farmer support and responsible financial services.

The web platform is deployed on a Contabo VPS and accessible at **[agriscan.co.ke](https://agriscan.co.ke)**. SMS and USSD access, production payment completion, crop-recommendation integration, SEO, and the IoT layer are the next implementation priorities.

## 4. Target Users and Customers

### Primary users

- Smallholder and semi-commercial farmers, beginning in Kenya.
- Farmer groups and cooperatives that need field-level monitoring and advice.

### Secondary users and customers

- Agricultural extension officers and agronomists.
- Produce buyers.
- Agrovets and input suppliers.
- Banks, MFIs, SACCOs, and insurers using consent-based farm data.
- Research, county, and development partners using privacy-preserving aggregate insights.

## 5. Innovation and Uniqueness

AgriScan combines capabilities normally delivered by separate systems:

- Soil- and climate-based crop recommendation.
- IoT-supported field monitoring.
- Image-based crop diagnosis.
- Context-aware multilingual agronomic advice.
- Role-based agricultural marketplace.
- Mobile money, SMS, and USSD access.
- Consent-based farm performance and health records.

The integrated data loop is the key innovation: sensor readings and farmer observations improve diagnosis; diagnosis informs advice and input choices; repeated activity builds a longitudinal farm record for better future recommendations.

## 6. Technology, Materials, and Methods

- **Core platform:** Django, PostgreSQL, Gunicorn, Nginx, and Docker on Contabo.
- **Crop diagnosis:** TensorFlow crop classifiers with an EfficientNet image gatekeeper.
- **Crop recommendation:** Gaussian Naive Bayes model initially covering 22 crops, to be integrated into the Django platform and improved with local validation.
- **Advisory intelligence:** Groq LLM, LangChain, ChromaDB, and Hugging Face embeddings.
- **IoT layer:** NPK and soil-moisture sensors, field gateway/controller, authenticated telemetry API, validation, and time-series storage.
- **Access:** Responsive web application, with SMS and USSD planned for low-bandwidth and feature-phone users.
- **Payments:** Safaricom M-Pesa Daraja integration.
- **Data governance:** Farmer consent, role-based access, secure transport, auditability, and minimum necessary data sharing.

AI recommendations will be presented as decision support rather than guaranteed agronomic outcomes. High-risk or uncertain cases should be escalated to an extension officer or agronomist.

## 7. Expected Impact

AgriScan is expected to:

- Improve crop selection using soil and climate conditions.
- Detect crop health problems earlier through images and field measurements.
- Reduce inappropriate fertiliser, pesticide, and irrigation use.
- Improve yields and resilience through timely, context-aware advice.
- Expand access to buyers, suppliers, payments, and responsible finance.
- Create useful farm records while keeping farmers in control of their data.

## 8. Implementation Outlook

1. **Integration and access:** Merge crop recommendation, finish M-Pesa, deliver SMS/USSD, improve SEO, and stabilise the deployed platform.
2. **IoT prototype:** Procure and calibrate sensors, implement telemetry ingestion, and test a small number of monitored plots.
3. **Field validation:** Compare recommendations with agronomist assessments and farmer outcomes; improve models and content.
4. **Scale:** Expand marketplace participation, partner services, counties, crops, and sensor deployments.

## 9. Team

- **Job Nyaribari:** Founder, Product and AI/Technical Lead.
- **Ziro:** Platform, integrations, DevOps, and data engineering.
- **Lynn:** Agricultural operations, farmer success, content, and field validation.
- **Stephen Kingori:** Crop Recommendation and Project Management Lead; owner of the existing crop recommendation system and its integration into AgriScan.

## 10. Conclusion

AgriScan is evolving from an AI crop-diagnosis application into a universal digital agricultural system. By combining crop planning, IoT field monitoring, diagnosis, advice, markets, payments, and consent-based farm records, it can support farmers from pre-planting decisions through production and sale.
