/**
 * Photos in /public, named by what they show so pages never carry stock-site
 * file names. To rename or swap a file, change the `src` here only.
 */
export type Photo = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** CSS object-position used when the photo is cropped into a frame. */
  focus?: string;
};

function photo(
  src: string,
  width: number,
  height: number,
  alt: string,
  focus?: string
): Photo {
  return { src, width, height, alt, focus };
}

export const PHOTOS = {
  // Brand imagery already in /public/images
  heroFarmer: photo(
    "/images/ai_assistant.jpeg",
    1200,
    675,
    "A farmer checking his crop on a phone"
  ),
  leafScan: photo(
    "/images/ai_diagnosis.png",
    640,
    640,
    "A leaf being scanned for disease, with scan results over the image"
  ),
  produceMarket: photo(
    "/images/farmers-market-produce-0812211-1024x691.jpg",
    1024,
    691,
    "Fresh farm produce at market"
  ),
  sustainableFarm: photo(
    "/images/sustainable.jpg",
    1200,
    675,
    "Sustainable farming landscape"
  ),

  // Photos added to /public
  plantPhoto: photo(
    "/woman-takes-photo-houseplant-share-social-media_53876-127044.jpg",
    740,
    493,
    "A hand photographing a plant with a phone"
  ),
  tomatoCheck: photo(
    "/black-woman-agronomist-modern-farmer-joyfully-inspects-tomato-quality-technological-greenhouse-using-tablet-smart-farming-she-checks-controls-growth-process_143683-14950.jpg",
    740,
    493,
    "A farmer checking tomato plants in a greenhouse with her phone"
  ),
  agronomist: photo(
    "/african-farmer-straw-hat-standing-against-background-lush-greenery-holding-tablet-his-hands_1095508-11015.jpg",
    740,
    415,
    "An agronomist in a white coat reading a tablet among green plants"
  ),
  phoneInHand: photo(
    "/mobile-search-man-looking-monkeypox-virus-details_1282959-1274.jpg",
    740,
    414,
    "A hand holding a phone that shows plant information"
  ),
  moneyPhone: photo(
    "/beautiful-african-lady-farm-feeling-excited-as-she-holds-her-phone-money_216356-907.jpg",
    740,
    490,
    "A smiling farmer holding a phone and cash in a bean field"
  ),
  fieldTablet: photo(
    "/medium-shot-woman-holding-tablet_23-2149894711.jpg",
    740,
    493,
    "A farmer reading a tablet in a field with hills behind her"
  ),
  solarPhone: photo(
    "/african-farmer-utilizing-solar-power-smart-farming-technology_824582-18126.jpg",
    577,
    740,
    "A farmer reading farm data on his phone between crop rows under solar panels",
    "50% 62%"
  ),
  vegetablePatch: photo(
    "/mixed-race-male-farmer-working-vegetable-patch-holding-digital-tablet_1339901-13661.jpg",
    740,
    494,
    "A farmer crouching in a vegetable patch with a tablet"
  ),
  textingFarm: photo(
    "/man-texting-with-cell-phone-farm_1009902-83830.jpg",
    740,
    493,
    "A farmer sending a text message on a basic phone"
  ),
  bananaFarmer: photo(
    "/farmer-using-digital-app-identify-crop-diseases_1314467-10312.jpg",
    740,
    740,
    "A farmer reading his phone among banana and maize plants",
    "50% 40%"
  ),
  marketPhone: photo(
    "/two-women-viewing-content-phone-local-african-market_181624-35124.jpg",
    740,
    493,
    "Two women laughing at a phone at a local market stall"
  ),
  gardenShop: photo(
    "/black-woman-running-flower-business-medium-shot_23-2149871123.jpg",
    740,
    494,
    "A shop owner using a tablet in a garden centre"
  ),
  businessPlans: photo(
    "/young-black-men-discussing-some-business-plans-be-executed-farmland_216356-76.jpg",
    740,
    493,
    "Two men looking at a laptop together on farmland"
  ),
  seedlingsSmile: photo(
    "/photorealistic-woman-organic-sustainable-garden-harvesting-produce_23-2151462996.jpg",
    423,
    740,
    "A smiling farmer holding a tablet among seedlings in a greenhouse",
    "50% 30%"
  ),
  greenhouseOveralls: photo(
    "/front-view-woman-holding-tablet_23-2149894719.jpg",
    493,
    740,
    "A farmer checking a tablet between pepper plants in a greenhouse",
    "50% 35%"
  ),
  kaleTablet: photo(
    "/smiley-woman-holding-tablet-full-shot_23-2149894710 (1).jpg",
    740,
    493,
    "A smiling farmer reading a tablet among kale plants"
  ),
} as const;
