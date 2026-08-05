import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UssdSimulator } from "@/components/UssdSimulator";

export const metadata: Metadata = {
  title: {
    absolute: "AgriScan — AI crop disease detection for Kenyan farmers",
  },
  description:
    "Snap a sick plant, get treatment advice in English or Kiswahili, connect with buyers, and build a Farm Health Score.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://agriscan.co.ke/#organization",
      name: "AgriScan",
      url: "https://agriscan.co.ke",
      logo: "https://agriscan.co.ke/images/agriscan_favicon.png",
      description:
        "AI-powered crop disease detection and farm advisory for Kenyan farmers.",
      areaServed: {
        "@type": "Country",
        name: "Kenya",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://agriscan.co.ke/#website",
      url: "https://agriscan.co.ke",
      name: "AgriScan",
      publisher: { "@id": "https://agriscan.co.ke/#organization" },
      inLanguage: ["en", "sw"],
    },
    {
      "@type": "SoftwareApplication",
      name: "AgriScan",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      url: "https://agriscan.co.ke",
      description:
        "Take a photo of a sick plant to get disease diagnosis and treatment advice in English or Kiswahili.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KES",
      },
      inLanguage: ["en", "sw"],
      provider: { "@id": "https://agriscan.co.ke/#organization" },
    },
  ],
};

const TRUST = [
  { num: "100+", label: "Diseases Detected" },
  { num: "24/7", label: "Support" },
  { num: "Bilingual", label: "EN + Kiswahili" },
  { num: "Secure", label: "Your Data Safe" },
];

const FEATURES = [
  {
    title: "Spot crop disease early",
    copy: "Take a clear photo of a sick leaf. AgriScan tells you what is wrong and how to treat it — for maize, potato, tomato, cassava, and more.",
    icon: "◎",
    large: true,
    image: "/images/ai_diagnosis.png",
  },
  {
    title: "Advice in your language",
    copy: "Ask questions in English or Kiswahili and get clear steps for pests, soil, and plant care — like talking to a trusted agronomist.",
    icon: "⌘",
    wide: true,
  },
  {
    title: "Find buyers nearby",
    copy: "Connect with people looking to buy your harvest and with shops that sell seed, fertiliser, and crop protection.",
    icon: "▣",
  },
  {
    title: "Plan with the weather",
    copy: "See local weather guidance so you know when to plant, water, or protect your crops from heavy rain.",
    icon: "☁",
  },
  {
    title: "Build trust for credit",
    copy: "Healthy farm activity builds your Farm Health Score. Share it with lenders when you need a loan for seed, inputs, or expansion.",
    icon: "◆",
    wide: true,
    accent: true,
  },
  {
    title: "Everything in one place",
    copy: "Scan crops, chat for advice, check the market, and manage your farm profile from one simple home.",
    icon: "▦",
  },
];

const HELP_ROWS = [
  {
    src: "/images/farmers-market-produce-0812211-1024x691.jpg",
    alt: "Fresh farm produce at market",
    title: "Sell what you grow",
    copy: "When your crops are healthy, AgriScan helps you reach buyers who need fresh produce. List what you have, find fair connections, and turn a good harvest into income.",
  },
  {
    src: "/images/sustainable.jpg",
    alt: "Sustainable farming landscape",
    title: "Protect your fields for tomorrow",
    copy: "We help you catch problems early so you lose fewer plants. Better care today means stronger soil, healthier crops, and more food for your family and community.",
  },
  {
    src: "/images/ai_assistant.jpeg",
    alt: "Farmer getting crop advice",
    title: "Get answers when you need them",
    copy: "Not sure which spray to use or why leaves are yellowing? Ask AgriScan any time — day or night — and get practical steps you can follow in the field.",
  },
];

const JOURNEY = [
  {
    title: "Choose your role and sign up",
    copy: "Open Create account, pick Farmer, Buyer, Input agency, or Lending partner. The form asks only for the details that role needs — then you land in the matching portal.",
  },
  {
    title: "Scan a leaf (farmers)",
    copy: "In Crop scanner, choose the crop, upload a clear leaf photo, and submit. AgriScan queues the job on a background worker, checks that the image is a plant, then returns the disease result.",
  },
  {
    title: "Act on the result",
    copy: "Read the diagnosis, then ask AgriBot in English or Kiswahili for treatment steps. Top up your wallet when free scans are used up, and find inputs or buyers nearby.",
  },
  {
    title: "Grow beyond the phone app",
    copy: "Build your Farm Health Score over time and share it with lenders only if you consent. No smartphone? Use the USSD short-code demo for wallet, advice, market, and score checks.",
  },
];

const ROLES = [
  {
    href: "/signup?role=farmer",
    title: "Farmers",
    copy: "Scan leaves, get advice, and build a Farm Health Score.",
  },
  {
    href: "/signup?role=buyer",
    title: "Buyers",
    copy: "Find produce listings and connect with growers near you.",
  },
  {
    href: "/signup?role=agency",
    title: "Input shops",
    copy: "List fertiliser, seed, and crop protection for local farmers.",
  },
  {
    href: "/signup?role=lender",
    title: "Lenders",
    copy: "Review Farm Health Scores for farmers who choose to share them.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <section className="hero-premium">
        <div className="hero-overlay" />
        <div className="relative z-[1] mx-auto w-full max-w-4xl animate-rise">
          <div className="hero-badge">Protect your crops · Grow your yield</div>
          <h1 className="hero-title">
            Healthier farms start with a <span>photo</span>
          </h1>
          <p className="hero-description">
            Snap a sick plant, get treatment advice in English or Kiswahili, and
            connect with buyers when your harvest is ready.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup?role=farmer" className="btn-hero-primary">
              Start scanning
            </Link>
            <Link href="#ussd-demo" className="btn-hero-secondary">
              Try phone (USSD) demo
            </Link>
          </div>
        </div>
      </section>

      <div className="trust-bar mx-4 animate-rise">
        {TRUST.map((item) => (
          <div key={item.label} className="text-center">
            <span className="trust-num">{item.num}</span>
            <span className="trust-label">{item.label}</span>
          </div>
        ))}
      </div>

      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-8 text-center sm:mb-10">
          <span className="hp-label">How AgriScan helps</span>
          <h2 className="section-title">Tools made for farmers</h2>
          <p className="section-lead">
            Simple ways to keep crops healthy, get advice, and find the right
            people to buy or supply what you need.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className={`bento-card ${
                f.large ? "xl:col-span-2 xl:row-span-2 !p-0" : f.wide ? "xl:col-span-2" : ""
              }`}
            >
              {f.image ? (
                <>
                  <div className="relative h-44 overflow-hidden sm:h-52">
                    <Image
                      src={f.image}
                      alt={f.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="bento-icon !mb-2 !text-2xl" aria-hidden>
                      {f.icon}
                    </div>
                    <h3 className="mb-1.5 text-base font-bold text-[var(--text-headline)]">
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--text-body)]">
                      {f.copy}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`bento-icon !mb-2 !text-2xl ${f.accent ? "!text-[var(--sun)]" : ""}`}
                    aria-hidden
                  >
                    {f.icon}
                  </div>
                  <h3 className="mb-1.5 text-base font-bold text-[var(--text-headline)]">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-body)]">
                    {f.copy}
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <span className="hp-label">How to use AgriScan</span>
          <h2 className="section-title">From signup to healthier farm</h2>
          <p className="section-lead">
            The same path the app follows today — role-based signup, queued leaf
            scans, AgriBot advice, and optional USSD or lender score sharing.
          </p>
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div
            className="absolute bottom-0 left-[23px] top-0 hidden w-0.5 bg-[repeating-linear-gradient(to_bottom,#2e7d32_0_8px,transparent_8px_16px)] opacity-30 md:block"
            aria-hidden
          />
          {JOURNEY.map((step, i) => (
            <div
              key={step.title}
              className={`journey-step ${i === 0 ? "active" : ""}`}
            >
              <div className="journey-index">{i + 1}</div>
              <div className="glass rounded-2xl px-4 py-3 md:px-5 md:py-4">
                <h3 className="mb-1 text-base font-bold text-[var(--text-headline)]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-body)]">
                  {step.copy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-we-help"
        className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 sm:py-14"
      >
        <div className="mb-2 text-center sm:mb-4">
          <span className="hp-label">For your farm</span>
          <h2 className="section-title">How we walk with farmers</h2>
          <p className="section-lead">
            Real help for the work you do every day — from the field to the
            market.
          </p>
        </div>

        {HELP_ROWS.map((row, i) => (
          <article
            key={row.src}
            className={`feature-row ${i % 2 === 1 ? "reverse" : ""}`}
          >
            <div className="feature-row-media">
              <Image
                src={row.src}
                alt={row.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="feature-row-copy">
              <h3 className="text-lg font-bold text-[var(--text-headline)] sm:text-xl">
                {row.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
                {row.copy}
              </p>
            </div>
          </article>
        ))}
      </section>

      <div className="px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <span className="hp-label">No smartphone? No problem</span>
          <h2 className="section-title">Use AgriScan from any phone</h2>
          <p className="section-lead">
            Dial a short code to check your wallet, ask for advice, find buyers,
            and more — even on a basic handset.
          </p>
        </div>
        <UssdSimulator />
      </div>

      <section id="portals" className="px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <span className="hp-label">Join AgriScan</span>
            <h2 className="section-title">Choose how you take part</h2>
            <p className="section-lead">
              Whether you grow, buy, supply inputs, or lend — there is a door for
              you.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLES.map((role) => (
              <Link
                key={role.href}
                href={role.href}
                className="bento-card !rounded-2xl !p-5 transition hover:-translate-y-1"
              >
                <h3 className="text-base font-bold text-[var(--leaf-deep)]">
                  {role.title}
                </h3>
                <p className="mt-1.5 text-sm text-[var(--text-body)]">{role.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="story" className="px-4 pb-16 pt-4 sm:px-6">
        <div className="glass mx-auto max-w-3xl rounded-3xl px-6 py-10 text-center sm:px-10">
          <span className="hp-label">Our story</span>
          <h2 className="section-title">Built for farmers first</h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-body)] sm:text-[0.9375rem]">
            AgriScan started in 2025 because crop disease often arrives too late,
            and markets feel far away. We help farmers stop losses early, feed
            their communities, and show lenders they are building a healthier
            farm.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="mailto:jobnyaribari808@gmail.com"
              className="btn-hero-primary !bg-[var(--leaf-deep)] !text-white hover:!bg-[var(--leaf)]"
            >
              Contact our team
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
