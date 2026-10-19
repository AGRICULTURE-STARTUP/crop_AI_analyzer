import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ToolCards } from "@/components/ToolCards";
import { TrustBar } from "@/components/TrustBar";
import { UssdSimulator } from "@/components/UssdSimulator";
import {
  CONTACT_EMAIL,
  FEATURES,
  JOURNEY,
  ROLES,
  STORY,
} from "@/lib/content";
import { PHOTOS } from "@/lib/photos";

export const metadata: Metadata = {
  title: {
    absolute: "Ukulima Bora — AI crop disease detection for Kenyan farmers",
  },
  description:
    "Snap a sick plant, get treatment advice in English or Kiswahili, check market prices, and build a Farm Health Score.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ukulimabora.co.ke/#organization",
      name: "Ukulima Bora",
      url: "https://ukulimabora.co.ke",
      logo: "https://ukulimabora.co.ke/UkulimaBoraagritechlogo/logo.png",
      description:
        "AI-powered crop disease detection and farm advisory for Kenyan farmers.",
      areaServed: {
        "@type": "Country",
        name: "Kenya",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://ukulimabora.co.ke/#website",
      url: "https://ukulimabora.co.ke",
      name: "Ukulima Bora",
      publisher: { "@id": "https://ukulimabora.co.ke/#organization" },
      inLanguage: ["en", "sw"],
    },
    {
      "@type": "SoftwareApplication",
      name: "Ukulima Bora",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      url: "https://ukulimabora.co.ke",
      description:
        "Take a photo of a sick plant to get disease diagnosis and treatment advice in English or Kiswahili.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KES",
      },
      inLanguage: ["en", "sw"],
      provider: { "@id": "https://ukulimabora.co.ke/#organization" },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader withAnnouncement />

      <section className="hero-premium">
        <div className="hero-premium__bg" aria-hidden />
        <div className="hero-premium__inner">
          <div>
            <h1 className="hero-title animate-rise">
              Healthier farms start with a <span>photo</span>
            </h1>
            <p className="hero-description animate-rise delay-1">
              Snap a sick plant, get treatment advice in English or Kiswahili,
              and check the latest market prices when your harvest is ready.
            </p>
            <div className="flex flex-wrap gap-3 animate-rise delay-2">
              <Link href="/signup?role=farmer" className="btn-hero-primary">
                Start scanning
              </Link>
              <Link href="#ussd-demo" className="btn-hero-secondary">
                Try phone (USSD) demo
              </Link>
            </div>
          </div>
          <div className="hero-photo animate-rise delay-2">
            <div className="hero-photo__frame">
              <Image
                src={PHOTOS.heroFarmer.src}
                alt={PHOTOS.heroFarmer.alt}
                width={PHOTOS.heroFarmer.width}
                height={PHOTOS.heroFarmer.height}
                sizes="(max-width: 960px) 100vw, 480px"
                priority
                className="block h-auto w-full"
              />
            </div>
            <div className="hero-photo__chip animate-drift">
              <Image
                src={PHOTOS.plantPhoto.src}
                alt={PHOTOS.plantPhoto.alt}
                width={PHOTOS.plantPhoto.width}
                height={PHOTOS.plantPhoto.height}
                sizes="132px"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <TrustBar />

      <section id="features" className="mk-section">
        <div className="mk-container grid gap-10 lg:grid-cols-[0.8fr_2.2fr] lg:items-start">
          <Reveal variant="left" className="lg:sticky lg:top-28">
            <span className="hp-label">How Ukulima Bora helps</span>
            <h2 className="section-title">Tools made for farmers</h2>
            <p className="section-lead section-lead--left">
              Simple ways to keep crops healthy, get advice, and find the right
              people to buy or supply what you need.
            </p>
            <Link href="/features" className="btn btn-pill btn-primary mt-7">
              See all features <ArrowRightIcon size={16} />
            </Link>
          </Reveal>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.slug} as="li" delay={(i % 3) * 90} className="h-full">
                <Link href={`/features#${f.slug}`} className="feature-card">
                  <span className="bento-icon" aria-hidden>
                    <f.Icon size={26} />
                  </span>
                  <div className="feature-card__body">
                    <h3 className="feature-card__title">{f.title}</h3>
                    <p className="feature-card__copy">{f.copy}</p>
                    <span className="feature-card__more">
                      Learn more <ArrowRightIcon size={16} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section id="tools" className="mk-section !pt-0">
        <div className="mk-container">
          <ToolCards />
        </div>
      </section>

      <section id="how-it-works" className="mk-section mk-section--white">
        <div className="mk-container">
          <Reveal className="mb-12 text-center">
            <span className="hp-label">How to use Ukulima Bora</span>
            <h2 className="section-title">From signup to healthier farm</h2>
            <p className="section-lead">
              The same path the app follows today — role-based signup, queued
              leaf scans, AgriBot advice, and optional USSD or lender score
              sharing.
            </p>
          </Reveal>
          <ol className="steps">
            {JOURNEY.map((step, i) => (
              <Reveal key={step.title} as="li" delay={i * 110} className="step">
                <div className="step__marker">
                  <span className="step__num">{i + 1}</span>
                </div>
                <div className="step__card">
                  <h3 className="step__title">{step.title}</h3>
                  <p className="step__copy">{step.copy}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <UssdSimulator />

      <section id="portals" className="mk-band mk-section">
        <div className="mk-container">
          <Reveal className="mb-10 text-center">
            <span className="hp-label !bg-white/15 !text-white">
              Join Ukulima Bora
            </span>
            <h2 className="section-title !text-white">
              Choose how you take part
            </h2>
            <p className="section-lead !text-white/85">
              Whether you grow, buy, supply inputs, or lend — there is a door
              for you.
            </p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role, i) => (
              <Reveal key={role.href} delay={i * 100} className="h-full">
                <Link href={role.href} className="mk-role h-full">
                  <div className="mk-role__photo">
                    <Image
                      src={role.photo.src}
                      alt={role.photo.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                      style={{ objectPosition: role.photo.focus }}
                    />
                    <span className="mk-role__icon">
                      <role.Icon size={20} />
                    </span>
                  </div>
                  <div className="mk-role__body">
                    <h3 className="text-base font-semibold text-[var(--leaf-deep)]">
                      {role.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--text-body)]">
                      {role.copy}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-[var(--leaf)]">
                      Sign up <ArrowRightIcon size={16} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="story" className="mk-section">
        <div className="mk-container">
          <Reveal variant="zoom">
            <div className="cta-split">
              <div className="cta-split__copy">
                <span className="hp-label !bg-white/15 !text-white">Our story</span>
                <h2 className="section-title !text-white">Built for farmers first</h2>
                <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-white/85">
                  {STORY}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/about" className="btn-hero-primary">
                    About us
                  </Link>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="btn-hero-secondary">
                    Contact our team
                  </a>
                </div>
              </div>
              <div className="cta-split__photo">
                <Image
                  src={PHOTOS.greenhouseOveralls.src}
                  alt={PHOTOS.greenhouseOveralls.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 40vw"
                  style={{ objectPosition: PHOTOS.greenhouseOveralls.focus }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
