# AgriScan Competitive Landscape

**Version:** 1.0  
**Date:** 20 September 2026  
**Scope:** Kenya and East Africa, mapped against AgriScan’s live product and planned IoT layers — not against the slide-deck version of the company.

---

## 1. Direct answer

AgriScan does not uniquely own diagnosis, soil advice, IoT, USSD, markets, or credit. Specialists already beat it on each slice.

The real fight is whether one Kenyan farmer identity can close the loop:

1. Plan from soil data
2. Watch the plot with sensors
3. Diagnose a leaf
4. Get Kiswahili advice
5. Buy inputs or sell produce
6. Pay with M-Pesa
7. Share a consent-based Farm Health Score

That loop is the differentiator. It is also mostly unfinished.


| Signal                                    | Finding                                                           |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Competitor lanes farmers actually compare | 6 (diagnosis, super-apps, soil/IoT, irrigation, markets, finance) |
| Hardest Kenya platform rival              | DigiFarm (`*944#` + M-Pesa)                                       |
| Hardest diagnosis rival                   | PlantVillage Nuru (free, offline, Swahili)                        |
| Only durable AgriScan edge                | The closed loop — and only if IoT ships                           |


---



## 2. What AgriScan is actually stacking

Competition only makes sense against the full stack at [agriscan.co.ke](https://agriscan.co.ke) and the IoT design in system docs: authenticated NPK and moisture telemetry, quarantined bad readings, AgriBot context, dashboards, then smart irrigation.

Crop recommendation, live USSD, and sensors are not production yet.


| Layer                                                   | Status                           | What a farmer gets                                   | Who already sells this                                   |
| ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Leaf diagnosis (11 crop models + gatekeeper)            | **Live**                         | Photo a leaf; pay KSh 20 after 2 free scans          | PlantVillage Nuru, Plantix, Agrio, Tumaini               |
| AgriBot EN / Kiswahili RAG                              | **Live, unvalidated**            | Chat advice; KSh 10 after 5 free questions           | Virtual Agronomist, Plantix, Apollo genAI plans          |
| Farmer / buyer / agrovet portals + KAMIS prices         | **Partial**                      | List produce, browse inputs, see market prices       | DigiFarm Soko, iProcure, Twiga (now in administration)   |
| M-Pesa wallet                                           | **Code ready, not live cutover** | STK top-up for scans and chat                        | DigiFarm, Apollo, AgriWallet, every Safaricom product    |
| Farm Health Score + lender API                          | **Infrastructure only**          | 300–850 score from scans, health ratio, market links | Apollo satellite scoring, DigiFarm credit, FarmDrive     |
| USSD / SMS                                              | **Simulator only**               | Feature-phone wallet, advice, market, score          | DigiFarm `*944#`, iShamba SMS, UjuziKilimo SMS results   |
| Crop recommendation (N, P, K, pH, temp, humidity, rain) | **Not integrated**               | 22-crop GaussianNB result with logged inputs         | Virtual Agronomist / iSDAsoil, UjuziKilimo SMS recs      |
| IoT NPK + soil moisture telemetry API                   | **Not started**                  | Device identity, validation, time series, dashboards | UjuziKilimo SoilPal, Synnefa FarmShield                  |
| Smart irrigation from sensor data                       | **Not started**                  | Moisture-triggered irrigation guidance / control     | SunCulture pumps, Synnefa drip + sensors, iTrace LoRaWAN |
| Drone / NDVI field scans                                | **Later roadmap**                | Cooperative-scale mapping                            | Farmonaut, Agrio satellite, Apollo remote sensing        |


**AgriScan scan crops today:** maize, potato, tomato, beans, wheat, cabbage, cauliflower, capsicum, cucumber, pea, onion.

**Missing versus Kenyan demand:** cassava, banana, coffee, tea, and sukuma wiki.

Internal sources: concept note, proposal, summary, system documentation, and the 17 September 2026 roadmap.

---



## 3. Feature overlap with the players that matter

Read down a column to see who can substitute AgriScan today. Read across a row to see who is a specialist versus a platform. “Yes” means shipped to farmers, not a pitch.

This matrix is a synthesis of public product claims, not a lab bake-off.


| Player                | Leaf AI            | Soil / crop rec            | IoT / irrigation                            | Chat / SMS / USSD           | Market                       | Pay / credit           |
| --------------------- | ------------------ | -------------------------- | ------------------------------------------- | --------------------------- | ---------------------------- | ---------------------- |
| **AgriScan (target)** | Yes (11 crops)     | Designed, not in UI        | Designed, not built                         | Chat live; USSD sim         | Partial                      | Wallet code; score API |
| PlantVillage Nuru     | Yes, offline       | No                         | No                                          | Swahili + iShamba SMS       | No                           | Free / donor           |
| Plantix               | Yes, 450+ issues   | Limited                    | No                                          | Local-language recs         | Community                    | Free / ads             |
| Agrio                 | Yes + satellite    | Limited                    | No                                          | Alerts, needs data          | No                           | M-Pesa sub             |
| Tumaini               | Banana / wilt only | No                         | No                                          | Confidence prompts          | No                           | Free / research        |
| DigiFarm              | Not core           | Soil testing access        | No hardware                                 | `*944#` + app + call centre | Soko + buyers                | Loans + M-Pesa         |
| Apollo Agriculture    | Planned via agents | Input packages             | Satellite, not soil IoT                     | Feature phone via agents    | Agrodealers                  | Credit + insurance     |
| Virtual Agronomist    | No                 | Yes, plot-level fertilizer | iSDAsoil maps, not sensors                  | WhatsApp chatbot            | No                           | Free for smallholders  |
| UjuziKilimo           | Planned imagery    | Yes, 13 soil factors       | Handheld SoilPal IoT                        | SMS in ~5 min               | No                           | Small SMS fee          |
| SunCulture            | No                 | Advice with pumps          | IoT solar irrigation + soil/weather rollout | App / support               | No                           | PAYG + insurance       |
| Synnefa               | No                 | Dashboard insights         | FarmShield N/moisture + drip + greenhouse   | FarmCloud app               | Herbs export                 | Hardware sale          |
| Twiga Foods           | No                 | No                         | No                                          | Ops app                     | B2B produce (admin Aug 2026) | Retailer credit        |


---



## 4. Competitors by lane



### 4.1 Pocket agronomist — diagnosis apps

This is the feature farmers will compare first, because it is what AgriScan already ships. In Kenyan field roundups for 2026, Nuru is treated as the default free tool.


| Player                     | Scale / proof                                                                                                                                                           | Why they beat AgriScan today                                                                                      | Where AgriScan can still win                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **PlantVillage Nuru**      | Penn State / CGIAR; cassava, maize, potato; Swahili; offline; iShamba follow-up. Public writeups cite tens of thousands of Kenyan users and Ministry extension support. | Free. Works with no airtime. Covers cassava mosaic, brown streak, FAW, MLN. Audio/Swahili for low-literacy users. | Nuru does not bill, sell inputs, score farms, or ingest sensors. It is a public-good scanner, not a commercial operating system. |
| **Plantix (PEAT)**         | GSMA Feb 2025: 135M downloads, ~10M farmers/year. India-first; expanding African languages. ICRISAT-backed treatment tips. Outbreak maps from farmer GPS.               | Disease encyclopedia at a scale AgriScan cannot match. Outbreak alerts are a network effect.                      | Not Kenya-native payments, KAMIS, USSD, or lender APIs. Weak on local agrovet fulfilment.                                        |
| **Agrio**                  | Image diagnosis + satellite stress and ward-level pest movement. Premium ~KSh 500–800/month in Kenyan roundups.                                                         | Better for larger horticulture / export farms that want alerts, not a one-shot leaf photo.                        | Too expensive and connectivity-heavy for most AgriScan smallholders. No marketplace or Farm Health Score.                        |
| **Tumaini (IITA / CGIAR)** | Fusarium and banana bacterial wilt; confidence scores; Kisii / Tharaka-Nithi use.                                                                                       | Owns banana, a crop AgriScan does not scan.                                                                       | Narrow crop. Partnership target, not a platform rival.                                                                           |




### 4.2 Kenya super-apps — credit, USSD, markets

These are the companies a bank, county, or cooperative will name in the same sentence as AgriScan. They have distribution AgriScan does not.


| Player                      | What they sell                                                                                                                                                                                                                                 | Threat to AgriScan                                                                                                   | Gap AgriScan can occupy                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DigiFarm (Safaricom)**    | One-stop: soil testing, inputs, insurance, mechanization, extension, buyer links, M-Pesa wallet, USSD `*944#`, app, call centre. Historical reporting of 1M+ registered users. DigiFarm 2026 app notes credit scoring and Soko matching.       | Highest. They already claim the integrated smallholder platform, on the rails every Kenyan farmer uses.              | Photo diagnosis is not their core. They finance inputs; they do not close a leaf-scan → agrovet → sensor → score loop. AgriScan can partner or stay thinner and better at diagnosis-plus-record. |
| **Apollo Agriculture**      | Kenya + Zambia. GSMA Apr 2025: ~400k farmers, yields 2–2.5× national average. Satellite + ML credit, bundled seed/fertilizer/insurance, 1,000+ agrodealers. Exploring genAI photo disease ID for field officers serving feature-phone farmers. | If they ship agent-side leaf ID, they absorb AgriScan’s diagnosis wedge inside a lending machine that already works. | Apollo is a lender with agronomy, not a farmer-owned marketplace or plot IoT system. Farm Health Score could be a third-party API into banks that are not Apollo.                                |
| **Twiga Foods**             | B2B produce logistics to dukas. ~$185M raised; peak ~140k outlets. Entered administration 17 Aug 2026 (renamed GT Flow Limited).                                                                                                               | Low as a going concern. High as a warning: farm-to-market logistics burns cash.                                      | Do not become a second Twiga. Keep marketplace as discovery and connections, not trucks and cold chain.                                                                                          |
| **iShamba / iCow / M-Farm** | SMS advisory, livestock tips, price info. Very wide but thin.                                                                                                                                                                                  | Low on product depth; high on habit. Farmers already get texts.                                                      | AgriScan USSD must do something those SMS lines cannot: wallet, score, diagnosis follow-up.                                                                                                      |




### 4.3 Soil, sensors, irrigation — the planned IoT layer

AgriScan’s planned IoT path is:

1. Registered devices
2. Authenticated telemetry API
3. Range / replay / idempotency checks
4. Quarantine bad NPK or moisture
5. Dashboards
6. AgriBot and crop-rec context
7. Later: smart irrigation

That is a software and data-quality play. Hardware vendors already occupy the field.


| Player                        | Hardware / data                                                                                                                                                                                                     | Advice layer                                                                                          | Implication for AgriScan IoT                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UjuziKilimo SoilPal**       | Handheld IoT probe. GSMA Nov 2024: under 5 minutes, SMS with 13 factors including moisture, temp, pH, NPK. Agents take it to the shamba. Lab tests cost ~KSh 3,000; fewer than 3% of Kenyan farmers ever test soil. | Paid SMS on fertilizer, water, and crop choice. FarmSuite app. Roadmap: visual/IR pest diagnosis.     | Closest soil-IoT rival. They win point-in-time tests via agents. AgriScan wins only if sensors stay on the plot and feed diagnosis, irrigation, and the Farm Health Score continuously. |
| **SunCulture**                | IoT solar pumps + drip. PAYG. Rolling out soil sensors and weather stations. Climate insurance with APA / IBISA (2025–26). Carbon credits on pumps.                                                                 | Usage and weather intelligence for customers who bought a pump.                                       | Do not compete on pumps. Partner: AgriScan software on SunCulture water + soil data, or stay software-only on cheaper moisture nodes.                                                   |
| **Synnefa**                   | FarmShield: temperature, soil moisture, nitrogen, light. FarmCloud. Smart greenhouses, drip kits, solar dryers. Nairobi hardware company.                                                                           | Dashboards and post-harvest drying control. Stronger on horticulture / export herbs than maize belts. | Greenhouse and dryer specialist. Overlap is FarmShield N + moisture. AgriScan should ingest their (or similar) telemetry rather than invent another probe.                              |
| **iTrace Africa**             | LoRaWAN soil-moisture sensors and automated valves in Kenya. Claims up to 50% water savings.                                                                                                                        | Irrigation automation, not agronomy chat or markets.                                                  | Natural actuator for AgriScan’s smart-irrigation layer. Competitor if AgriScan builds valves; partner if AgriScan stays the brain.                                                      |
| **Virtual Agronomist (iSDA)** | No probe. WhatsApp bot pulls iSDAsoil maps from GPS. Guardian 2024: Kericho coffee farmer cut wasted fertilizer and hit 7.3 t.                                                                                      | Free, field-specific nutrient plans. Expanding in Kenya.                                              | Beats AgriScan’s unintegrated 22-crop notebook model on local credibility. AgriScan needs measured NPK (farmer or sensor), not only a generic GNB pickle.                               |


**IoT positioning that survives contact with the market**

Sell a calibrated plot record that diagnosis and irrigation can trust.

- Do not sell “we have sensors.” UjuziKilimo already has sensors.  
- Do not sell “we irrigate.” SunCulture already irrigates.  
- AgriScan’s IoT layer only differentiates if quarantined telemetry changes the advice, the scan interpretation, the crop choice, and later the lender score.



### 4.4 Finance, insurance, inputs around the farmer


| Player                     | Lane                                                         | Relationship to AgriScan                                                                           |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| FarmDrive                  | Alternative smallholder credit scores                        | Direct rival to Farm Health Score if lenders want telco/mobile data instead of scan activity.      |
| AgriWallet                 | Value-chain wallet: save, pay agrovet, get produce payment   | Overlaps M-Pesa wallet. AgriScan should stay on Daraja, not rebuild a second agri-wallet.          |
| Pula                       | Index insurance bundled with seed/fertilizer; Apollo partner | Complement. Score + scan history could help insurers; do not build an insurance company.           |
| iProcure                   | Agro-input supply chain for agrovets                         | Agency portal competitor on inputs logistics; partner for genuine product fulfilment after a scan. |
| Farmonaut / CropIn / Amini | Satellite farm OS and Africa earth observation               | Better remote sensing than AgriScan’s later drone idea. Use them; do not fake NDVI.                |


---



## 5. Key differentiators — only if the loop is real



### 5.1 Defend these

**One farmer identity across the season**  
Nuru diagnoses and stops. UjuziKilimo tests soil and stops. SunCulture waters and stops. DigiFarm finances and stops short of a leaf model. AgriScan’s claim is the same plot ID tying recommendation, telemetry, scan, AgriBot, market, and score.

**Diagnosis as a commerce moment**  
The agrovet portal is timed to the scan, not to a generic input catalogue. That is closer to “right product now” than DigiFarm’s seasonal loan bundle or Plantix’s generic spray list.

**Measured context for AgriBot**  
Planned IoT is not a pretty chart. It is provenance-tagged NPK and moisture that AgriBot must cite, and that never silently enter the model if quarantined. Almost no Kenya chatbot does that.

**Consent-based activity score**  
Apollo infers risk from satellites. DigiFarm infers it from loans and sales. AgriScan’s score is built from health scans and completed market links, with an opt-in API. Different signal — only useful after real usage, which the roadmap still lacks.

**Kenya commercial packaging**  
KSh 10–20 M-Pesa micro-charges, Kiswahili, KAMIS, county profiles, USSD designed in. Plantix and Agrio are global apps wearing a Swahili coat. That is a real local edge if payments actually settle.

### 5.2 Do not pretend these are edges


| Claim                           | Why it is not an edge                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| “AI diagnosis.”                 | Nuru is free, offline, and better known. Plantix has the corpus.                                                  |
| “We will have IoT.”             | SoilPal, FarmShield, and SunCulture already ship devices.                                                         |
| “USSD inclusion.”               | DigiFarm `*944#` is live on Safaricom. AgriScan has a homepage keypad.                                            |
| “Lending API.”                  | Engagement points are not agronomy. Lenders will ask for repayment data, satellite NDVI, or M-Pesa history first. |
| “22-crop recommender.”          | Virtual Agronomist already gives plot-level fertilizer plans from soil maps Kenyan farmers are using.             |
| “We connect farmers to buyers.” | Twiga raised ~$185M and still went into administration. Logistics is not a software feature.                      |


---



## 6. Who is actually dangerous, in order


| Rank | Player                               | Why they can make AgriScan irrelevant                                                                                                            | Counter                                                                                                                                    |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | **DigiFarm**                         | Distribution, USSD, M-Pesa, credit, and markets on the national telco. If they add a decent leaf model, the integrated-platform story is theirs. | Be the diagnosis + plot-record layer they do not build. Or stay out of their loan bundle and win horticulture / county pilots they ignore. |
| 2    | **PlantVillage Nuru**                | Farmers will not pay KSh 20 for a worse, online-only scan of maize when a free offline app exists.                                               | Charge for the report + agrovet + history, not for the raw class label. Add cassava and banana. Ship offline later.                        |
| 3    | **Apollo Agriculture**               | They already monetize the farmer via credit. Photo ID on the field-officer app is on their GSMA roadmap.                                         | Sell the Farm Health Score to other banks/SACCOs. Do not try to out-lend Apollo.                                                           |
| 4    | **UjuziKilimo + Virtual Agronomist** | Together they cover soil test, SMS recs, and WhatsApp fertilizer plans — AgriScan’s pre-plant and IoT stories.                                   | Integrate or white-label SoilPal / iSDAsoil instead of a generic 22-crop pickle. Win on continuous plot telemetry + diagnosis.             |
| 5    | **SunCulture / Synnefa / iTrace**    | They own irrigation hardware relationships and sensor installs.                                                                                  | Be the brain: ingest their moisture and N, drive AgriBot and irrigation advice. Do not start a pump company.                               |
| 6    | **Plantix / Agrio**                  | Global diagnosis quality and outbreak maps. African language expansion is explicit.                                                              | Local fulfilment (M-Pesa, agrovet, KAMIS, USSD) and Kenyan crop mix. Do not race their image corpus.                                       |


---



## 7. Whitespace that is still open in Kenya



### Still open

- A trusted, plot-level record that mixes leaf images, calibrated NPK/moisture, weather, and treatments, then exposes that record to AgriBot and (with consent) to a lender. Nobody ships that loop end-to-end for Kenyan smallholders.
- Diagnosis-triggered agrovet fulfilment with M-Pesa, not a seasonal input loan. DigiFarm finances bags of fertilizer; it does not convert “late blight 82%” into a nearby product in minutes.
- Feature-phone follow-up after a smartphone scan (family member scans, farmer gets USSD/SMS). Nuru is smartphone-only in the field; DigiFarm USSD does not diagnose leaves.



### Closed or a trap

- Being “the AI crop app.” That category is occupied by free CGIAR tools and Plantix.
- Building another produce logistics network. Twiga’s 2026 administration is the market’s verdict on that cost structure.
- Cheap uncalibrated NPK sticks sold as lab-grade truth. AgriScan’s own docs already flag drift. Shipping that without a protocol hands UjuziKilimo and county labs an easy attack.
- Livestock. Aniwise and iCow own animal health. Stay on crops.

---



## 8. Sources

Web search and page extracts, 20 September 2026.


| Source                                   | URL                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DigiFarm                                 | [https://digifarmkenya.com](https://digifarmkenya.com)                                                                                                                                                                                                                                                                                                                                 |
| Safaricom DigiFarm FAQs                  | [https://www.safaricom.co.ke/media-center-landing/frequently-asked-questions/digifarm-faqs](https://www.safaricom.co.ke/media-center-landing/frequently-asked-questions/digifarm-faqs)                                                                                                                                                                                                 |
| GSMA Plantix (Feb 2025)                  | [https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/programme/agritech/detecting-and-managing-crop-pests-and-diseases-with-ai-insights-from-plantix](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/programme/agritech/detecting-and-managing-crop-pests-and-diseases-with-ai-insights-from-plantix)       |
| GSMA Apollo (Apr 2025)                   | [https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/programme/agritech/ai-driven-smallholder-farmer-lending-in-africa-insights-from-apollo-agriculture](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/programme/agritech/ai-driven-smallholder-farmer-lending-in-africa-insights-from-apollo-agriculture) |
| GSMA UjuziKilimo (Nov 2024)              | [https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/boosting-soil-health-in-kenya-ujuzikilimos-iot-solution](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/boosting-soil-health-in-kenya-ujuzikilimos-iot-solution)                                                                             |
| SunCulture                               | [https://sunculture.io/about-us](https://sunculture.io/about-us)                                                                                                                                                                                                                                                                                                                       |
| Synnefa                                  | [https://synnefa.io](https://synnefa.io)                                                                                                                                                                                                                                                                                                                                               |
| Guardian / Virtual Agronomist (Sep 2024) | [https://www.theguardian.com/world/2024/sep/30/high-tech-high-yields-the-kenyan-farmers-deploying-ai-to-increase-productivity](https://www.theguardian.com/world/2024/sep/30/high-tech-high-yields-the-kenyan-farmers-deploying-ai-to-increase-productivity)                                                                                                                           |
| Kenyan 2026 AI app roundup               | [https://crazykanairofarming.com/top-7-best-ai-apps-for-kenyan-farmers](https://crazykanairofarming.com/top-7-best-ai-apps-for-kenyan-farmers)                                                                                                                                                                                                                                         |
| Twiga administration (Sep 2026)          | [https://trendtype.com/news/twiga-foods-has-been-put-into-administration](https://trendtype.com/news/twiga-foods-has-been-put-into-administration)                                                                                                                                                                                                                                     |
| PlantVillage Kenya                       | [https://iafrica.com/plantvillage-ai-for-crop-disease-detection-in-kenya](https://iafrica.com/plantvillage-ai-for-crop-disease-detection-in-kenya)                                                                                                                                                                                                                                     |


AgriScan capabilities from internal documents: [concept note](./concept_note.md), [proposal](./proposal.md), [summary](./summary.md), [system documentation](./SYSTEM_DOCUMENTATION.md), and [project status and roadmap](./project_status_and_roadmap.md) (17 September 2026).