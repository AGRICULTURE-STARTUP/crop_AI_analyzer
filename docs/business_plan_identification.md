# Ukulima Bora Business Plan — Problem Identification

**Version:** 1.0  
**Date:** 27 September 2026  
**Scope:** Kenyan smallholder and semi-commercial crop farmers. This document defines the problems Ukulima Bora's business model is built on. Customer segments, value proposition, revenue, and financials follow in later sections.

---

## 1. Direct answer

A Kenyan smallholder loses money at three points in every season:

1. **While growing:** the crop gets sick and the farmer cannot get the right fix in time.
2. **At harvest:** the farmer must sell quickly, to one broker, at a low price.
3. **Between seasons:** the farmer has no record of how they farm, so cannot get credit for the next season's inputs.

Ukulima Bora leads with Problem 1. Diagnosis is live, it is the reason farmers open the app, and it creates the users and data that Problems 2 and 3 depend on.

| # | Problem | When it hits | Ukulima Bora answer | Status |
| - | ------- | ------------ | --------------- | ------ |
| 1 | Sick crop, no trusted fix in time | During the growing season | Leaf diagnosis, Kiswahili/English advice, matching product at a nearby agrovet, M-Pesa payment | Diagnosis and AgriBot live; agrovet and M-Pesa partial |
| 2 | Forced quick sale at a low price | At harvest | More buyers, trust from scan history, grouped selling with neighbours | Portals and KAMIS prices partial |
| 3 | No farm record, no credit | Between seasons | Consent-based farm record and Farm Health Score for lenders | Infrastructure only |

---

## 2. Problem 1 — The sick crop (lead problem)

### Problem statement

When a smallholder sees disease or pest damage, there is no one to give a confident diagnosis and tell them what to buy, where, and how much, in time to save the crop. They guess, spray the wrong or unsuitable product, or wait, and lose part of the harvest and money on wrong inputs.

### Evidence

- **Too few extension officers.** Kenya has about 1 extension officer per 1,380 farmers, against a national target of 1:600 and an FAO recommendation of 1:400. Some counties reach 1:2,000. ([Agriculture Extension Manual, FSRP 2025](https://fsrp.go.ke/sites/default/files/2025-08/Agriculture%20Extension%20Manual%20v1%20final.pdf))
- **Losses to pests and diseases are large and have not improved.** Globally, pests and diseases destroy an estimated 30–40% of crop production, a figure that has barely changed in 50 years. ([Bonilla et al., 2024](https://www.tandfonline.com/doi/full/10.1080/19439342.2023.2181848))
- **Naming the disease is not the whole fix.** Free tools such as PlantVillage Nuru already identify diseases. None of them connect the diagnosis to the right product at a nearby agrovet, M-Pesa payment, and a follow-up check. That gap is where farmers still lose money.

### Who feels it

- **Farmers:** lost yield, wasted spend on wrong or unsuitable inputs.
- **Agrovets:** miss sales at the moment of need; sell by guesswork.
- **Counties:** cannot extend extension coverage without hiring many more officers.

### What Ukulima Bora does

Photo of a leaf → diagnosis with confidence level → Kiswahili or English advice from AgriBot → matching product at a nearby agrovet → M-Pesa payment → follow-up scan. Uncertain or high-risk cases are escalated to an agronomist.

### Solution, pricing, and payment

| Solution | Offered to | Price | How they pay |
| -------- | ---------- | ----- | ------------ |
| **Leaf diagnosis report** (disease, confidence, treatment by active ingredient, nearby agrovets) | Farmers | 2 free scans, then **KSh 20 per scan** (current price) | M-Pesa STK push tops up the Ukulima Bora wallet; each scan is deducted from the balance |
| **AgriBot advice** (Kiswahili / English) | Farmers | 5 free questions, then **KSh 10 per question** (current price) | Deducted from the same wallet |
| **Season pack** (to test) | Farmers | e.g. **KSh 150 for 10 scans + 20 questions** | One M-Pesa top-up |
| **Basic agrovet listing** | Agrovets | **Free** (keeps coverage wide and product data complete) | — |
| **Verified Partner** (badge, featured placement, stock updates, monthly referral and sales report) | Agrovets | **KSh 2,000 per month**, after a free 3-month pilot | Monthly M-Pesa payment to the Ukulima Bora Paybill (account = agrovet ID), or an STK prompt sent each month |
| **Order commission** (once M-Pesa ordering is live) | Agrovets | **3–5% of orders** paid through Ukulima Bora (to test) | Deducted automatically before the agrovet is paid out via M-Pesa |
| **Outbreak and demand reports** | Pesticide and seed manufacturers, distributors | Starting hypotheses: **KSh 50,000–150,000 per county-season report**, or **KSh 300,000–1,000,000 per year** subscription. Confirm in buyer interviews. | Invoice; bank transfer or M-Pesa Paybill; quarterly or annual contract |
| **Public outbreak alerts** | Ministry, counties, farmers | **Free** | — |
| **Outbreak dashboards and surveillance** | Counties, research bodies, development programmes | Grant- or contract-funded, priced per project | Bank transfer against milestones in the grant or contract |

**Notes**

- Farmer prices stay low because PlantVillage Nuru is free. Farmers pay for the full answer (treatment, where to buy, history), not the disease name alone.
- `Wallet` and `MpesaTransaction` already exist in `apps/api/main_app/models.py`. M-Pesa STK code is ready but not yet switched live.
- Data prices are hypotheses until 3–5 potential buyers have been interviewed.

### Agrovet partnership model

Agrovets in each county share their product catalogue, prices, and stock. Ukulima Bora sends them farmers who have just diagnosed a problem and need a specific product. Once Ukulima Bora can prove it brings customers, agrovets pay a monthly fee.

#### What each side gets

| Party | Gets |
| ----- | ---- |
| **Agrovets** | Customers at the moment of need: a farmer who has just scanned late blight is ready to buy today. |
| **Ukulima Bora** | Accurate, local product and price data, so advice points to products farmers can actually buy nearby. |
| **Farmers** | A complete answer: what is wrong, what to buy, where, and at what price. |

#### Design rules

1. **Prove value before charging.** Agrovets are small, cash-tight shops. They will not pay until Ukulima Bora can show how many customers it sent them.
2. **Track every referral.** Without tracking, agrovets cannot see the value and will stop paying. Options, from weakest to strongest:
   - Referral code on the scan result, shown at the shop.
   - Discount voucher redeemable only through Ukulima Bora.
   - Payment through Ukulima Bora via M-Pesa, so every sale is recorded.
3. **Make price and stock updates effortless.** Agrovets will not log into a website weekly. Stale data (product missing, price wrong) destroys farmer trust.
   - Updates by WhatsApp or SMS (e.g. "Ridomil 250g 850").
   - Weekly update reminders.
   - Listings marked out of date after 30 days without an update.
   - Farmer feedback after each visit: "Was it in stock at this price?"
4. **Keep advice neutral.** If agrovets pay, farmers and funders will ask whether recommendations are for sale.
   - Recommend the treatment by active ingredient first (e.g. "a mancozeb-based fungicide"), then list nearby shops that stock it.
   - Clearly label any paid placement as "Featured".
   - Payment never changes the diagnosis or the treatment advice.
5. **Recommend only legal products from licensed shops.** In 2025 the Pest Control Products Board (PCPB) withdrew 77 pesticide products and restricted 202 more, and it is cracking down on agrovets selling unregistered products.
   - Only PCPB-registered products are recommended.
   - Partner agrovets are checked for valid licences.
   - "Verified by Ukulima Bora" becomes part of what is sold.

#### Fee economics (KSh 2,000 per month)

**For the agrovet.** If agrovet margins are about 15–25% (an assumption to confirm in interviews), KSh 2,000 is covered by about KSh 8,000–13,000 of extra monthly sales: roughly 8–13 farmers spending about KSh 1,000 each. Realistic once Ukulima Bora has active users in the area, not before.

**For Ukulima Bora.** Kenya has over 10,000 agro-dealers. ([FSD Kenya](https://fsdkenya.org/blog/evolving-agricultural-credit-a-combi-model-for-input-and-trade-financing/https://fsdkenya.org/blog/evolving-agricultural-credit-a-combi-model-for-input-and-trade-financing))

| Paying agrovets | Monthly | Yearly |
| --------------- | ------- | ------ |
| 50 (one or two counties) | KSh 100,000 | KSh 1.2M |
| 500 (about 5% of agro-dealers) | KSh 1M | KSh 12M |
| 2,000 (about 20% of agro-dealers) | KSh 4M | KSh 48M |

A meaningful revenue stream, but not enough on its own. It sits alongside farmer payments and, later, lender and manufacturer revenue.

#### Rollout plan

1. **Pilot (about 3 months).** 20–50 agrovets in 1–2 counties, free. They share catalogue and prices; Ukulima Bora tracks every farmer it sends them.
2. **Proof.** Each agrovet receives a monthly report, e.g. "32 farmers were sent to you, 19 bought, estimated KSh 24,000 in sales."
3. **Charge.** Recommended mixed model:
   - **Free basic listing:** keeps coverage wide and product data complete.
   - **Verified Partner, KSh 2,000/month:** badge, featured placement, stock updates, monthly sales report.
   - **Commission:** a small percentage on orders paid through Ukulima Bora once M-Pesa is live.

Alternatives considered: flat subscription for all (simple, predictable, harder to sell early) and pay per customer, e.g. KSh 50–100 per farmer who buys (easiest to accept, less predictable).

#### Competitor to watch: Shamba Pride

[Shamba Pride](https://techcrunch.com/2024/01/21/shamba-pride-raises-3-7m-funding) raised $3.7M in 2024. It gives agrovets inventory, ordering, and record-keeping tools, brands them as "DigiShops", and runs farmer advice by USSD (`*483*199#`). Shamba Pride helps agrovets run their shops; Ukulima Bora brings them customers with a diagnosed problem. That makes it a possible partner rather than a direct rival.

#### Open questions

- Actual agrovet margins on crop-protection products and seed.
- How many farmer referrals per month an agrovet needs before paying feels worth it.
- Whether agrovets prefer a flat fee or pay per customer.
- Whether Shamba Pride would partner, and on what terms.

### Disease and demand data model

Over time, scans and agrovet data show which diseases are spreading, where, what farmers need, and what is in stock. Combined and anonymised, this is valuable to input manufacturers, government, researchers, and insurers. Manufacturers are the main paying buyers; government usually brings grants and partnerships rather than direct purchases.

#### Who uses it and how they pay

| Stakeholder | What they want | How they pay |
| ----------- | -------------- | ------------ |
| **Pesticide and seed manufacturers** (Syngenta, Bayer, Corteva, Osho, Twiga Chemicals, Elgon Kenya, Amiran) | Where diseases are rising, what farmers need, which areas lack stock, seasonal demand | Subscription or paid reports (main commercial buyer) |
| **Distributors and large agrovet chains** | Stock planning, e.g. "late blight rising in Nyandarua; nearby agrovets low on mancozeb" | Subscription |
| **Ministry of Agriculture and counties** | Early warning for fall armyworm, maize lethal necrosis (MLN), late blight; where to send extension officers | Grants, project contracts, or county contracts |
| **Research bodies** (KALRO, KEPHIS, CABI, CGIAR) | Disease spread data for research and surveillance | Research partnerships and co-funded grants; can also help validate model accuracy |
| **Insurers** (Pula, ACRE Africa) | Outbreak risk by area to price crop insurance | Data licence |
| **Development programmes** (World Bank Food Systems Resilience Project, FAO) | Evidence and monitoring for their programmes | Grants and contracts |

#### Products

1. **Outbreak map:** diseases by crop, county or ward, and week.
2. **Demand report:** diagnoses matched to recommended active ingredients and nearby agrovet stock, showing supply gaps.
3. **Agrovet price and stock data:** what is selling where, at what price.
4. **Farmer surveys (later):** a manufacturer pays to ask farmers questions; farmers opt in, possibly for a small reward.

**Never sold:** farmer names, phone numbers, or individual farm data. Manufacturers never target individual farmers directly; that would break the neutral-advice rule in the agrovet model.

#### Two tiers: public good and paid product

- **Free:** basic public outbreak alerts (e.g. "fall armyworm reports rising in Trans Nzoia this week") shared with the Ministry, counties, and farmers. Builds trust, attracts grants, and helps farmers Ukulima Bora does not yet serve.
- **Paid:** detailed commercial analytics for companies: demand, stock gaps, trends, and custom cuts of the data.

#### What must be true before anyone pays

1. **Enough data.** A steady flow of scans in each reported county, every season. Sell data for pilot counties only at first.
2. **Accuracy.** The disease models are not yet field-validated, and a false outbreak alert would damage Ukulima Bora's reputation quickly.
   - Count only high-confidence diagnoses.
   - Have a regular sample checked by an agronomist, ideally with KALRO or KEPHIS.
   - Publish the accuracy level with each report.
3. **Honesty about coverage.** The data reflects Ukulima Bora users only: mostly smartphone owners in certain counties and crops. Reports say so rather than claim to represent all of Kenya.
4. **Privacy.**
   - Combine data at ward or sub-county level.
   - Never show an area with fewer than about 10 farmers.
   - Disclose this use in the privacy policy, as required by the Data Protection Act.

#### Timing

Sell after one to two seasons with good coverage in the pilot counties. **Start collecting the right data now**, because it costs almost nothing. For every scan, record:

- Crop, diagnosis, confidence level, date, and ward or GPS location.
- Treatment recommended, by active ingredient.
- Which agrovet the farmer was sent to and whether they bought.
- The agrovet's stock and price at that time.

#### Pricing

No reliable benchmark exists yet for what Kenyan input companies pay for this data. Set prices after interviewing 3–5 potential buyers (e.g. marketing or product teams at two manufacturers and one distributor): what decisions the data would help them make, and what they currently pay for market research.

#### Open questions

- Scan volume per county needed before outbreak reports are credible.
- Which research body (KALRO, KEPHIS, CABI) will partner on accuracy validation.
- What manufacturers currently pay for market and disease intelligence.
- Whether a county government will co-fund a pilot outbreak dashboard.

---

## 3. Problem 2 — The forced sale

### Problem statement

At harvest, perishable produce must sell within days. Smallholders usually have one or two brokers at the farm gate, no way to prove their produce is good quality, and no time to wait for a better offer. They sell fast and cheap, and part of the harvest rots before it is sold.

### Evidence

- **Large losses between farm and plate.** About 30–40% of food in Kenya is lost between the farm gate and the family table, worth about **KSh 72 billion a year** for selected crops. ([Kenya Post-Harvest Management Strategy, citing FAO](https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-POST-HARVEST-MANAGEMENT-ON-FOOD-LOSS-AND-WASTE-REDUCTION-STRATEGY.pdf))
- **Horticulture is worst hit.** Losses on fruit and vegetables in Kenya have been reported as high as 50%, mostly from poor storage and handling. ([CGIAR](https://cgspace.cgiar.org/server/api/core/bitstreams/d89bb600-6f14-4e86-8a8c-53e2248ee873/content))
- **Farmers sell at the farm gate under pressure.** Farmers sell to brokers right after harvest because produce spoils and they need cash. ([Kilelu et al., 2024](https://www.frontiersin.org/journals/horticulture/articles/10.3389/fhort.2024.1474056/full))
- **Price information is not the gap.** Over 90% of surveyed small horticulture farmers already receive price information. ([RSIS study](https://rsisinternational.org/journals/ijriss/articles/running-head-factors-affecting-market-access-for-horticultural-farmers)) What they lack is more buyers to choose from, buyer trust in their quality, and time.

### Who feels it

- **Farmers:** low prices, spoiled produce.
- **Buyers, cooperatives, exporters:** inconsistent supply and unknown quality.

### What Ukulima Bora does

- Farmers list produce; buyers post what they need; both sides browse each other.
- Scan history acts as a quality signal ("this plot was checked healthy three times this season").
- Later: neighbours group their produce to reach bulk buyers.

### What Ukulima Bora will not do

Own trucks, warehouses, or cold rooms; buy and resell produce; guarantee prices. Twiga Foods raised about $157–185M building that logistics layer and entered administration in August 2026. Market access is a software feature connected to diagnosis and the farm record, not a logistics business.

### Solution, pricing, and payment

| Solution | Offered to | Price | How they pay |
| -------- | ---------- | ----- | ------------ |
| **Produce listings** (with photos, KAMIS price, scan badge) | Farmers | **Free** | — |
| **Browse buyers and buyer requests** | Farmers | **Free** | — |
| **Post buyer requests and browse farmers** | Buyers | **Free during the pilot** | — |
| **Buyer subscription** (early access to listings, quality information, unlimited contacts) | Small traders | e.g. **KSh 500 per month** (to test) | M-Pesa STK prompt or Paybill, monthly |
| **Buyer subscription** | Bulk buyers: hotels, schools, hospitals, processors | e.g. **KSh 2,000–5,000 per month** (to test) | M-Pesa Paybill or invoice and bank transfer, monthly or quarterly |
| **Unlock farmer contact** (alternative to subscription) | Occasional buyers | e.g. **KSh 50–100 per contact** (Uza Zao charges KSh 100 per lead) | Deducted from the buyer's Ukulima Bora wallet, topped up by M-Pesa |
| **Commission on deals** (later, once M-Pesa deposits exist) | Buyers | **2–5% of deal value** | Buyer pays the full amount by M-Pesa; the farmer is paid via M-Pesa on confirmed collection, minus the commission |

**Notes**

- Farmers do not pay on the marketplace. They are the side Ukulima Bora is protecting, and buyers get the most value from reliable supply.
- Start with free access for both sides, then introduce subscriptions or contact unlocks once buyers are finding real supply.
- **Holding buyer money before releasing it to farmers may require Central Bank of Kenya authorisation** under payment rules. Before launching deposits, get legal advice, or use a licensed payment provider's escrow instead of holding funds directly.

### Lean marketplace model

Buyers post what they need, farmers post what they have, and both sides browse each other. They agree the deal and payment directly. No bidding, deposits, or pooled lots in the first version; these are added only when real usage shows they are needed.

#### Already built

`apps/api/main_app/models.py` has `FarmerProfile` and `BuyerProfile` (with county) and `MarketConnection`, which records a farmer–buyer link with status Pending, Completed, or Cancelled. Missing: structured produce listings and buyer requests. Farmer crops are currently a single free-text field, and buyers cannot post what they need.

#### Must have (build now)

1. **Buyer requests:** crop, quantity, target price, county, date needed. Example: "50 crates of tomatoes, Nakuru, by Friday, about KSh 2,500 per crate."
2. **Farmer listings:** crop, quantity, price (fixed or negotiable), county, harvest date, photos.
3. **Browse and filter both ways** by crop, county, and date. Farmers browse buyers and their requests; buyers browse farmers and their listings.
4. **"I'm interested" button:** creates a `MarketConnection` and shares phone numbers (in-app chat later). The deal and payment happen directly between the two parties.
5. **Mark as sold:** either side marks the connection Completed, with final quantity and price.

#### Small additions that matter

- **Verify buyers,** at minimum by phone number. Fake buyers and payment scams are common in produce trading; one scam story will drive farmers away.
- **Show the KAMIS price** beside each listing and request so farmers can spot a low offer.
- **Scan badge on farmer listings** (e.g. "plot scanned 3 times this season"). This is the edge over Uza Zao and E-azy Agro at almost no build cost.
- **Simple ratings** after a completed deal.

#### Why "Mark as sold" matters

Even with no money passing through Ukulima Bora, recorded deals provide:

- **Proof** for investors and funders: "X deals worth KSh Y completed in 3 months."
- **Farm Health Score data:** the score already counts market connections.
- **Pricing evidence:** real deal sizes to price a commission or buyer subscription later.

To get deals recorded, make it one tap or one SMS: "Did you sell to [buyer]? Reply 1 = Yes, 2 = No."

#### Deferred to later

| Feature | Add when |
| ------- | -------- |
| Bidding (with farmer minimum price, short 2–24 hour auctions, "Buy now") | An area has enough active buyers per crop for real competition |
| M-Pesa deposit held by Ukulima Bora, released on collection | Buyer no-shows or farm-gate price cuts become a reported problem, or commission charging starts |
| Pooled lots from neighbouring farmers | Bulk buyers ask for volumes single farmers cannot supply |
| Partner transporters (never owned trucks) | Collection becomes the main reason deals fail |
| Listing and accepting deals by SMS / USSD | USSD goes live |

#### Revenue

Free for now so both sides join. Later options, in the order to try them:

1. **Buyer subscription** for bulk buyers (hotels, schools, processors): early access to listings and quality information.
2. **Pay to unlock contact:** buyers pay a small fee to see a farmer's number.
3. **Commission (2–5%)** once M-Pesa deposits exist, charged to the buyer where possible.

Benchmark: [Uza Zao](https://www.uzazao.com/) charges 5% per sale, KSh 100 per lead, or KSh 100 per day to boost a listing.

#### Competitors and lessons

- **Uza Zao** and **E-azy Agro** already run produce listing and bidding marketplaces in Kenya. Listing alone is not a differentiator; Ukulima Bora's edge is that farmers are already in the app for diagnosis, and scan history proves quality.
- **India's e-NAM** online produce auctions showed what breaks bidding: too few bidders, trader collusion (about 81% of surveyed farmers named cartels as their top problem), buyers refusing to bid on produce they cannot see, lower bids after rejection, and slow payment. ([Sage journal study](https://journals.sagepub.com/doi/10.1177/2277975218807277); [Extension Journal](https://www.extensionjournal.com/article/view/632/7-5-33); [MicroSave report](https://www.microsave.net/wp-content/uploads/2019/06/190624_eNAM-report.pdf)) This is why bidding is deferred.

#### Open questions

- Which buyer types to recruit first in the pilot counties (hotels, schools, processors, traders).
- How many active buyers per crop and county are needed before farmers see value.
- Whether buyers will pay to unlock contacts or prefer a subscription.
- How often deals are actually recorded as sold without a payment in the system.

---

## 4. Problem 3 — No record, no credit

### Problem statement

Smallholders have no verifiable record of what they grow, how they manage their crops, or what they sell. Banks, SACCOs, and insurers cannot assess them, so most farmers cannot borrow to buy inputs, which keeps yields low and repeats Problems 1 and 2 the next season.

### Evidence

- **Many farmers, little lending.** Kenya has between 4.5 million ([PentaPay, citing the Ministry of Agriculture and World Bank](https://www.pentapay.africa/post/digitizing-agricultural-trade-credit-in-kenya-with-pentapay)) and 8.7 million ([FSD Kenya](https://fsdkenya.org/blog/evolving-agricultural-credit-a-combi-model-for-input-and-trade-financing/https://fsdkenya.org/blog/evolving-agricultural-credit-a-combi-model-for-input-and-trade-financing)) smallholder farmers, depending on definition.
- **Agriculture gets a small share of credit.** Agricultural credit was 4.3% of private-sector credit in 2016 and 3.6% in 2018. ([Kiambu coffee study](https://www.academia.edu/121767953/Impact_of_Agricultural_Credit_on_Coffee_Productivity_An_Analysis_of_the_Perceptions_of_Smallholder_Farmers))
- **Agrovets carry the informal credit risk.** Most farmer–agrovet transactions during planting are on informal credit repaid after harvest, with an estimated KSh 10–12 billion outstanding each season. ([PentaPay](https://www.pentapay.africa/post/digitizing-agricultural-trade-credit-in-kenya-with-pentapay))

### Who feels it

- **Farmers:** cannot buy the right inputs at planting.
- **Lenders and insurers:** no data to price smallholder risk.
- **Agrovets:** defaults and disputes on informal credit.

### What Ukulima Bora does

Every scan, treatment, purchase, and sale builds a farm record. With the farmer's consent, it becomes a Farm Health Score (300–850) that lenders can query through an API. The farmer controls who sees it.

This problem is only solvable once farmers use Ukulima Bora repeatedly. It is the third step, not the opening pitch.

### Solution, pricing, and payment

| Solution | Offered to | Price | How they pay |
| -------- | ---------- | ----- | ------------ |
| **Farm record and share code** (farmer shares their report with a chosen lender) | Farmers | **Free, always**. Charging farmers to access credit would hurt trust and look exploitative to funders. | — |
| **Farm Activity Report per query** | SACCOs, microfinance institutions, insurers | **KSh 100–300 per report** (to test) | Prepaid credits bought by M-Pesa Paybill or bank transfer, or a monthly invoice based on `LendingAPIUsageLog` |
| **Lender subscription** (bulk checks) | Lenders checking many farmers | e.g. **KSh 10,000–30,000 per month** for a set number of reports (to test) | Monthly invoice; bank transfer or M-Pesa Paybill |
| **Referral fee per approved loan** | Lenders | e.g. **KSh 200–500 flat, or 1–2% of the loan value** (to test) | Monthly invoice for loans approved through Ukulima Bora share codes |
| **Credit checks for input credit** | Agrovets offering inputs on credit | A set number of checks included in Verified Partner (KSh 2,000/month), then e.g. **KSh 50 per check** | Added to the monthly Verified Partner M-Pesa payment |
| **Validation pilot** (100–200 farmers) | One SACCO or agrovet group | **Free** (Ukulima Bora needs the repayment data to prove the score) | — |
| **Data supplied through a credit reference bureau** (if Ukulima Bora partners with one) | Credit reference bureau | Revenue share or data licence, negotiated | Per the bureau contract; bank transfer |

**Notes**

- Revenue here starts only after the validation pilot shows the score predicts repayment, and after one to two seasons of farmer activity.
- All prices are hypotheses to confirm with at least three lenders.
- Legal advice on credit reference bureau rules is needed before any lender is charged for a score.

### Farm record and lender model

With the farmer's permission, Ukulima Bora shares a farm report and score with a lender when the farmer applies for a loan. The lender uses it alongside its own checks to decide.

#### Already built

- `FarmHealthProfile`: score (300–850), risk tier, and an `opt_in_for_lending` flag.
- `LendingPartnerProfile`, `LendingAPIKey`, `LendingAPIUsageLog`: lenders query the score through an API; each query is logged.
- `apps/api/main_app/utils_scoring.py`: calculates the score from scan count (max +200), share of healthy scans (max +200), and completed market connections (max +150).

#### Problems with the current score

1. **Easy to game.** Scanning the same healthy leaf 20 times gives 300 + 200 + 200 = 700, "Low Risk", with no sales at all.
2. **Punishes good farmers.** Rewarding the share of "healthy" results lowers the score of farmers who scan because they spotted disease, which is exactly the behaviour Ukulima Bora wants.
3. **Market connections can be faked.** Three completed connections give full points, and a friend with a buyer account can mark them completed.
4. **Measures app use, not ability to repay.** Lenders care about income, farm size, sales, and repayment history.
5. **Not tested against real loans.** Nobody has checked whether high scores repay more often.

#### What lenders actually want

| Lender's question | Data Ukulima Bora can provide |
| ----------------- | ------------------------- |
| Does the farm exist, and is it the size claimed? | GPS location from scans, farm size, crops grown, seasons active |
| Do they manage the crop well? | Disease caught **and treated**, with a follow-up scan showing recovery |
| Do they invest in inputs? | Agrovet purchases through Ukulima Bora (Problem 1) |
| Do they earn money? | Marketplace sales marked sold, with value (Problem 2) |
| Are they consistent? | Activity across more than one season |
| Later | Soil and moisture sensor data, M-Pesa wallet history |

The agrovet purchases and marketplace sales are what make the score believable. Scan counts alone never will.

#### Legal: consent and regulation

- **Data Protection Act 2019.** Register with the Office of the Data Protection Commissioner (ODPC). Consent must be specific, informed, and revocable. A single yes/no opt-in flag is not enough; the farmer approves each share, with each lender, for each application.
- **Credit reference rules.** The Central Bank of Kenya licenses credit reference bureaus (Metropol, TransUnion, Creditinfo). A lawyer must confirm whether selling a "credit score" to lenders brings Ukulima Bora under those rules. Safer options:
  - Call it a **Farm Activity Report** and let the lender make the credit decision.
  - **Partner with a licensed credit reference bureau** and supply data through them.
- **Do not lend.** Lending brings Ukulima Bora under the Central Bank's digital credit rules. Ukulima Bora stays a data provider.

#### Sharing flow: the farmer shares, not Ukulima Bora

1. The farmer applies for a loan at a SACCO or agrovet.
2. In Ukulima Bora (or by USSD) they tap "Share my farm report with [lender]" and get a one-time code.
3. The lender enters the code and sees the report and score, once.
4. Every share is logged, and the farmer can see who viewed their data.

#### Who to sell to first

1. **Agrovets giving inputs on credit.** They carry about KSh 10–12 billion in informal credit each season and are already partners from Problem 1. A report showing regular purchases and recorded sales helps them decide who gets inputs on credit.
2. **SACCOs and microfinance institutions** in the pilot counties.
3. **Input financiers and insurers** such as Pula and ACRE Africa.
4. **Banks,** once there is repayment evidence.

#### Validating the score

Pilot with one SACCO or a group of agrovets:

1. They lend to 100–200 Ukulima Bora farmers using their normal process, with the Ukulima Bora report alongside.
2. Ukulima Bora tracks who repays.
3. The score is adjusted until it actually separates farmers who repay from those who do not.

Only after this is the score worth paying for.

#### Revenue

- **Pay per report:** e.g. KSh 100–300 per query (an assumption to test with lenders). `LendingAPIUsageLog` already supports per-query billing.
- **Referral fee** per approved loan.
- **Subscription** for lenders who check many farmers.

This revenue comes after agrovet and marketplace revenue. It needs one to two seasons of farmer activity first.

#### Score fixes (for the record, not for immediate build)

- Cap scans counted per day and per plot; ignore repeated identical images.
- Reward treatment followed by recovery instead of the share of healthy scans.
- Count only completed sales with a value, confirmed by both sides or paid through M-Pesa.
- Add farm size, seasons active, and agrovet purchases.
- Replace the single opt-in flag with per-lender, per-application consent records.

#### Competitors

- **Apollo Agriculture:** lends directly using satellite data and machine learning; about 400,000 farmers.
- **FarmDrive:** alternative credit scoring for smallholders; partnered with Safaricom on DigiFarm loans.
- **DigiFarm (Safaricom):** input loans on M-Pesa data.
- **Credit reference bureaus:** hold repayment history; potential partners rather than rivals.

Ukulima Bora's different signal is crop management, input purchases, and sales from the same farmer identity, not satellite images or telco data.

#### Open questions

- Legal opinion on whether a lender-facing score requires a credit reference bureau licence or partnership.
- Which SACCO or agrovet group will run the validation pilot.
- What lenders will pay per report.
- How many seasons of data are needed before the score predicts repayment.

---

## 5. How the three problems connect

```
Sick crop fixed early  ──►  more and better produce to sell
        │                              │
        ▼                              ▼
Scan and treatment history ──► buyer trust at harvest
        │                              │
        └──────────►  Farm record  ◄───┘
                          │
                          ▼
             Credit for next season's inputs
                          │
                          ▼
              Better inputs → healthier crop
```

Each problem feeds the next. Other players solve one point: PlantVillage Nuru diagnoses, DigiFarm finances and links to markets, Apollo lends. Ukulima Bora's claim is one farmer identity across all three.

---

## 6. Framing by audience

| Audience | Problem framing |
| -------- | --------------- |
| **Investors** | Kenyan smallholders lose a large share of each harvest because diagnosis comes too late and is not linked to buying the right fix. Ukulima Bora turns each sick-leaf photo into an agrovet sale, then into better market access and a farm record lenders can use: three points where Ukulima Bora can earn. |
| **Grant funders** | With about one extension officer per 1,380 farmers, most smallholders get no timely help when crops get sick, lose produce after harvest, and cannot borrow. Ukulima Bora gives them Kiswahili diagnosis and advice, links to genuine inputs and buyers, and a farm record they own. |
| **Internal** | The job to win first is "my crop is sick — what do I buy, where, today?" Every feature should shorten that path. Market access and credit build on the users it creates. |

---

## 7. Problems deliberately left out of the lead

| Problem | Why it is not in the lead |
| ------- | ------------------------- |
| Choosing the right crop before planting | Real, but crop recommendation is not integrated yet, and Virtual Agronomist already offers free plot-level plans. Roadmap item. |
| Continuous soil and moisture monitoring (IoT) | Real, but not started, and it needs hardware partners. It strengthens Problems 1 and 3 later. |
| Digital exclusion of feature-phone users | A delivery channel (USSD/SMS), not a separate problem. It applies to all three problems. |

---

## 8. Evidence gaps to close

1. **Willingness to pay.** Desk research shows the problems exist, not that farmers will pay Ukulima Bora to solve them. Use live platform data: scans per user, scan-to-purchase conversion, repeat use.
2. **Field interviews.** Interview 20–30 farmers and 5–10 agrovets on Problems 1 and 2.
3. **Kenya-specific crop-loss figures.** Replace the global 30–40% pest-loss figure with Kenyan maize and tomato estimates from CABI's Global Burden of Crop Loss work.
4. **One smallholder count.** Choose a single, sourced number of Kenyan smallholders (currently 4.5M–8.7M).
5. **Updated credit figures.** Replace the 2016/2018 agricultural credit share with current Central Bank of Kenya data.
6. **Middlemen share.** The common "middlemen take 40–60% of value" claim has no reliable source yet. Do not use it until a proper study is found.
