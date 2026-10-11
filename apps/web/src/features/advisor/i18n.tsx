"use client";

import { useCallback, useEffect, useState } from "react";
import type { CropCategory, CropMeta } from "./types";

export type Lang = "en" | "sw";

const EN = {
  title: "Crop advisor",
  lead: "Find the crop that suits your soil and weather. We compare your values with 2,200 field records for 22 crops.",
  soil: "Soil test",
  soilHint: "From your soil test report",
  weather: "Weather",
  weatherHint: "Conditions for this season",
  N: "Nitrogen (N)",
  P: "Phosphorus (P)",
  K: "Potassium (K)",
  ph: "Soil pH",
  temperature: "Temperature",
  humidity: "Humidity",
  rainfall: "Rainfall",
  typical: "Typical",
  examples: "Try an example",
  exPaddy: "Paddy field",
  exMaize: "Maize shamba",
  exCoffee: "Coffee farm",
  exBanana: "Banana farm",
  submit: "Get recommendation",
  analysing: "Analysing…",
  clear: "Clear",
  location: "Town or county",
  useWeather: "Use local weather",
  loadingWeather: "Loading weather…",
  weatherFilled: "Filled from the weather in {place}. Rainfall is a 30-day estimate from the 5-day forecast.",
  weatherSignIn: "Log in to fill these from your local weather.",
  emptyTitle: "Your best crops will appear here",
  emptyBody: "Enter your soil test and weather values, then press Get recommendation.",
  bestMatch: "Best match",
  confidence: "Model confidence",
  conditionsInRange: "Conditions in range",
  nextClosest: "Next closest",
  inRange: "{n} of 7 conditions in range",
  compare: "How your field compares with {crop}",
  yours: "Yours",
  typicalRange: "Typical",
  low: "Low",
  ok: "Good",
  high: "High",
  outOfRange: "Some values are outside what the model learned from, so treat this as rough guidance:",
  disclaimer:
    "Guidance from a model trained on a public dataset. Confirm with a soil test and your local extension officer before you plant.",
  modelLine: "{algorithm} · {accuracy}% accurate on held-out records · {rows} records",
  askBot: "Ask AgriBot how to grow it",
  askBotMessage: "How do I grow {crop} in {place}? My soil test: N {N}, P {P}, K {K}, pH {ph}.",
  prices: "See market prices",
  shopSeed: "Shop seed and inputs",
  cropProfile: "Crop profile",
  saveCta: "Create a free account to save results",
  saved: "Saved to your history",
  history: "Your recent recommendations",
  historyEmpty: "Results you get while signed in are saved here.",
  load: "Use these values",
  delete: "Delete",
  library: "Crop library",
  libraryLead: "The conditions each of the 22 crops grew in, from 100 field records per crop.",
  search: "Search crops",
  all: "All",
  conditions: "Conditions this crop grew in",
  conditionsLead: "Each bar shows the full range in the records. The darker band is the middle 80%, and the dot is the average.",
  checkField: "Check my field",
  backLibrary: "All crops",
  required: "Fill in all seven values.",
  failed: "The recommendation could not load. Try again.",
} as const;

type Key = keyof typeof EN;

const SW: Record<Key, string> = {
  title: "Mshauri wa mazao",
  lead: "Pata zao linalofaa udongo na hali ya hewa yako. Tunalinganisha thamani zako na rekodi 2,200 za mashamba kwa mazao 22.",
  soil: "Kipimo cha udongo",
  soilHint: "Kutoka kwenye ripoti ya kipimo cha udongo",
  weather: "Hali ya hewa",
  weatherHint: "Hali ya msimu huu",
  N: "Naitrojeni (N)",
  P: "Fosforasi (P)",
  K: "Potasiamu (K)",
  ph: "pH ya udongo",
  temperature: "Joto",
  humidity: "Unyevu hewani",
  rainfall: "Mvua",
  typical: "Kawaida",
  examples: "Jaribu mfano",
  exPaddy: "Shamba la mpunga",
  exMaize: "Shamba la mahindi",
  exCoffee: "Shamba la kahawa",
  exBanana: "Shamba la ndizi",
  submit: "Pata ushauri",
  analysing: "Inachambua…",
  clear: "Futa",
  location: "Mji au kaunti",
  useWeather: "Tumia hali ya hewa ya eneo",
  loadingWeather: "Inapakia hali ya hewa…",
  weatherFilled: "Imejazwa kutoka hali ya hewa ya {place}. Mvua ni makadirio ya siku 30 kutoka utabiri wa siku 5.",
  weatherSignIn: "Ingia ili kujaza hizi kutoka hali ya hewa ya eneo lako.",
  emptyTitle: "Mazao bora kwako yataonekana hapa",
  emptyBody: "Weka thamani za kipimo cha udongo na hali ya hewa, kisha bonyeza Pata ushauri.",
  bestMatch: "Linalofaa zaidi",
  confidence: "Uhakika wa modeli",
  conditionsInRange: "Hali ndani ya kiwango",
  nextClosest: "Linalofuata",
  inRange: "Hali {n} kati ya 7 ziko ndani ya kiwango",
  compare: "Shamba lako ukilinganisha na {crop}",
  yours: "Yako",
  typicalRange: "Kawaida",
  low: "Chini",
  ok: "Sawa",
  high: "Juu",
  outOfRange: "Baadhi ya thamani ziko nje ya kile modeli ilijifunza, kwa hivyo chukua huu kama mwongozo wa jumla:",
  disclaimer:
    "Huu ni mwongozo kutoka kwa modeli iliyofunzwa kwa data ya umma. Thibitisha kwa kipimo cha udongo na afisa wa ugani wa eneo lako kabla ya kupanda.",
  modelLine: "{algorithm} · usahihi {accuracy}% kwenye rekodi za majaribio · rekodi {rows}",
  askBot: "Uliza AgriBot jinsi ya kulikuza",
  askBotMessage: "Ninawezaje kukuza {crop} katika {place}? Kipimo cha udongo wangu: N {N}, P {P}, K {K}, pH {ph}.",
  prices: "Angalia bei za soko",
  shopSeed: "Nunua mbegu na pembejeo",
  cropProfile: "Maelezo ya zao",
  saveCta: "Fungua akaunti bila malipo ili kuhifadhi matokeo",
  saved: "Imehifadhiwa kwenye historia yako",
  history: "Ushauri wako wa hivi karibuni",
  historyEmpty: "Matokeo unayopata ukiwa umeingia yanahifadhiwa hapa.",
  load: "Tumia thamani hizi",
  delete: "Futa",
  library: "Maktaba ya mazao",
  libraryLead: "Hali ambazo kila moja ya mazao 22 lilikua, kutoka rekodi 100 za mashamba kwa kila zao.",
  search: "Tafuta mazao",
  all: "Yote",
  conditions: "Hali ambazo zao hili lilikua",
  conditionsLead: "Kila mstari unaonyesha kiwango chote kwenye rekodi. Sehemu nzito ni asilimia 80 ya katikati, na nukta ni wastani.",
  checkField: "Pima shamba langu",
  backLibrary: "Mazao yote",
  required: "Jaza thamani zote saba.",
  failed: "Ushauri haukupatikana. Jaribu tena.",
};

const CATEGORY: Record<Lang, Record<CropCategory, string>> = {
  en: { cereal: "Cereals", pulse: "Pulses", fruit: "Fruits", cash: "Cash crops" },
  sw: { cereal: "Nafaka", pulse: "Jamii ya kunde", fruit: "Matunda", cash: "Mazao ya biashara" },
};

const STORAGE_KEY = "agriscan_advisor_lang";

/** English / Kiswahili switch for the advisor and crop library, remembered per browser. */
export function useAdvisorLang() {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "sw" || saved === "en") setLangState(saved);
    } catch {
      /* storage unavailable: stay in English */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) => {
      let text: string = lang === "sw" ? SW[key] : EN[key];
      for (const [name, value] of Object.entries(vars || {})) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
      return text;
    },
    [lang]
  );

  return { lang, setLang, t };
}

export function cropName(crop: Pick<CropMeta, "name" | "name_sw">, lang: Lang) {
  return lang === "sw" ? crop.name_sw : crop.name;
}

export function categoryName(category: CropCategory, lang: Lang) {
  return CATEGORY[lang][category] ?? category;
}

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="segmented segmented--sm" role="group" aria-label="Language / Lugha">
      <button type="button" className={lang === "en" ? "is-active" : ""} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
        English
      </button>
      <button type="button" className={lang === "sw" ? "is-active" : ""} onClick={() => setLang("sw")} aria-pressed={lang === "sw"}>
        Kiswahili
      </button>
    </div>
  );
}
