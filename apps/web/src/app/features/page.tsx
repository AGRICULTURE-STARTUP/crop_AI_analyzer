import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ToolCards } from "@/components/ToolCards";
import { FEATURES } from "@/lib/content";
import { PHOTOS } from "@/lib/photos";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Scan crop diseases from a photo, get advice in English or Kiswahili, find buyers, plan with the weather, and build a Farm Health Score.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <SiteHeader />

      <PageHero
        crumb="Features"
        eyebrow="How Ukulima Bora helps"
        title="Tools made for farmers"
        lead="Simple ways to keep crops healthy, get advice, and find the right people to buy or supply what you need."
        photo={PHOTOS.tomatoCheck}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/signup?role=farmer" className="btn-hero-primary">
            Start scanning
          </Link>
          <Link href="/#ussd-demo" className="btn-hero-secondary">
            Try phone (USSD) demo
          </Link>
        </div>
      </PageHero>

      <section className="mk-section">
        <div className="mk-container space-y-20 lg:space-y-28">
          {FEATURES.map((f, i) => (
            <div
              key={f.slug}
              id={f.slug}
              className={`feat-row ${i % 2 === 1 ? "reverse" : ""}`}
            >
              <Reveal
                variant={i % 2 === 0 ? "left" : "right"}
                className="feat-row__media-wrap"
              >
                <div className="feat-row__media">
                  <Image
                    src={f.photo.src}
                    alt={f.photo.alt}
                    fill
                    sizes="(max-width: 900px) 100vw, 540px"
                    style={{ objectPosition: f.photo.focus }}
                  />
                </div>
              </Reveal>
              <Reveal delay={140}>
                <div className="bento-icon">
                  <f.Icon size={26} />
                </div>
                <h2 className="section-title">{f.title}</h2>
                <p className="section-lead section-lead--left">{f.copy}</p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--leaf)] transition hover:gap-2.5"
                >
                  Get started <ArrowRightIcon size={16} />
                </Link>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="mk-section !pt-0">
        <div className="mk-container">
          <Reveal className="mb-10 text-center">
            <span className="hp-label">Open to everyone</span>
            <h2 className="section-title">Plan your season and stock up</h2>
            <p className="section-lead">
              Two tools you can use on the web today, with or without an account.
            </p>
          </Reveal>
          <ToolCards />
        </div>
      </section>

      <section className="mk-band mk-section">
        <Reveal className="mk-container text-center">
          <span className="hp-label !bg-white/15 !text-white">Join Ukulima Bora</span>
          <h2 className="section-title !text-white">
            Healthier farms start with a photo
          </h2>
          <p className="section-lead !text-white/85">
            Snap a sick plant, get treatment advice in English or Kiswahili, and
            connect with buyers when your harvest is ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup?role=farmer" className="btn-hero-primary">
              Start scanning
            </Link>
            <Link href="/about" className="btn-hero-secondary">
              About us
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
