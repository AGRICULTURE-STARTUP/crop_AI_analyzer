import {
  BankIcon,
  BasketIcon,
  ChatIcon,
  ClockIcon,
  CloudIcon,
  GridIcon,
  ScanIcon,
  ShieldIcon,
  SproutIcon,
  StoreIcon,
} from "@/components/Icons";
import { PHOTOS } from "@/lib/photos";

/** Public-site copy shared by Home, Features and About us. */

export const CONTACT_EMAIL = "jobnyaribari808@gmail.com";

export const STORY =
  "Ukulima Bora started in 2025 because crop disease often arrives too late, and fair prices are hard to know. We help farmers stop losses early, see current market prices, feed their communities, and show lenders they are building a healthier farm.";

export const TRUST = [
  { num: "100+", label: "Diseases Detected", Icon: ScanIcon },
  { num: "24/7", label: "Support", Icon: ClockIcon },
  { num: "Bilingual", label: "EN + Kiswahili", Icon: ChatIcon },
  { num: "Secure", label: "Your Data Safe", Icon: ShieldIcon },
];

/** Tools that grew out of the farmer portal and are open to everyone on the web. */
export const TOOLS = [
  {
    href: "/crop-advisor",
    eyebrow: "Crop advisor",
    title: "Know what to plant",
    copy: "Enter your soil test and this season’s weather to see which of 22 crops suits your field, in English or Kiswahili.",
    cta: "Try the crop advisor",
    photo: PHOTOS.seedlingsSmile,
    Icon: SproutIcon,
  },
  {
    href: "/marketplace",
    eyebrow: "Marketplace",
    title: "Buy inputs near you",
    copy: "Seed, fertiliser and crop protection from registered agrovets. Compare prices by county and call the seller directly.",
    cta: "Open the marketplace",
    photo: PHOTOS.gardenShop,
    Icon: StoreIcon,
  },
];

/** `slug` is the anchor each card links to on the Features page. */
export const FEATURES = [
  {
    slug: "scan",
    title: "Spot crop disease early",
    copy: "Take a clear photo of a sick leaf. Ukulima Bora tells you what is wrong and how to treat it — for maize, potato, tomato, cassava, and more.",
    Icon: ScanIcon,
    photo: PHOTOS.leafScan,
  },
  {
    slug: "advice",
    title: "Advice in your language",
    copy: "Ask questions in English or Kiswahili and get clear steps for pests, soil, and plant care — like talking to a trusted agronomist.",
    Icon: ChatIcon,
    photo: PHOTOS.phoneInHand,
  },
  {
    slug: "prices",
    title: "Know what your crop is worth",
    copy: "Check the latest KAMIS wholesale and retail prices for your crop across Kenyan markets, and find agrovets for seed, fertiliser, and crop protection.",
    Icon: BasketIcon,
    photo: PHOTOS.moneyPhone,
  },
  {
    slug: "weather",
    title: "Plan with the weather",
    copy: "See local weather guidance so you know when to plant, water, or protect your crops from heavy rain.",
    Icon: CloudIcon,
    photo: PHOTOS.fieldTablet,
  },
  {
    slug: "credit",
    title: "Build trust for credit",
    copy: "Healthy farm activity builds your Farm Health Score. Share it with lenders when you need a loan for seed, inputs, or expansion.",
    Icon: ShieldIcon,
    photo: PHOTOS.solarPhone,
  },
  {
    slug: "all-in-one",
    title: "Everything in one place",
    copy: "Scan crops, chat for advice, check the market, and manage your farm profile from one simple home.",
    Icon: GridIcon,
    photo: PHOTOS.vegetablePatch,
  },
];

export const JOURNEY = [
  {
    title: "Choose your role and sign up",
    copy: "Open Create account, pick Farmer, Input agency, or Lending partner. The form asks only for the details that role needs — then you land in the matching portal.",
  },
  {
    title: "Scan a leaf (farmers)",
    copy: "In Crop scanner, choose the crop, upload a clear leaf photo, and submit. Ukulima Bora queues the job on a background worker, checks that the image is a plant, then returns the disease result.",
  },
  {
    title: "Act on the result",
    copy: "Read the diagnosis, then ask AgriBot in English or Kiswahili for treatment steps. Top up your wallet when free scans are used up, check market prices, and find inputs nearby.",
  },
  {
    title: "Grow beyond the phone app",
    copy: "Build your Farm Health Score over time and share it with lenders only if you consent. No smartphone? Use the USSD short-code demo for wallet, advice, prices, and score checks.",
  },
];

export const ROLES = [
  {
    href: "/signup?role=farmer",
    title: "Farmers",
    copy: "Scan leaves, get advice, check prices, and build a Farm Health Score.",
    Icon: SproutIcon,
    photo: PHOTOS.bananaFarmer,
  },
  {
    href: "/signup?role=agency",
    title: "Input shops",
    copy: "List fertiliser, seed, and crop protection for local farmers.",
    Icon: StoreIcon,
    photo: PHOTOS.gardenShop,
  },
  {
    href: "/signup?role=lender",
    title: "Lenders",
    copy: "Review Farm Health Scores for farmers who choose to share them.",
    Icon: BankIcon,
    photo: PHOTOS.businessPlans,
  },
];

export const HELP_ROWS = [
  {
    photo: PHOTOS.produceMarket,
    title: "Know what your harvest is worth",
    copy: "When your crops are healthy, check the latest KAMIS prices for your crop so you can negotiate and sell with better information.",
  },
  {
    photo: PHOTOS.sustainableFarm,
    title: "Protect your fields for tomorrow",
    copy: "We help you catch problems early so you lose fewer plants. Better care today means stronger soil, healthier crops, and more food for your family and community.",
  },
  {
    photo: PHOTOS.kaleTablet,
    title: "Get answers when you need them",
    copy: "Not sure which spray to use or why leaves are yellowing? Ask Ukulima Bora any time — day or night — and get practical steps you can follow in the field.",
  },
];
