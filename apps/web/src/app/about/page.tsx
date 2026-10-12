import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustBar } from "@/components/TrustBar";
import { CONTACT_EMAIL, HELP_ROWS, ROLES, STORY } from "@/lib/content";
import { PHOTOS } from "@/lib/photos";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Ukulima Bora started in 2025 to help farmers stop crop losses early, feed their communities, and show lenders they are building a healthier farm.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <SiteHeader />

      <PageHero
        crumb="About us"
        eyebrow="Our story"
        title="Built for farmers first"
        lead={STORY}
        photo={PHOTOS.agronomist}
      >
        <div className="flex flex-wrap gap-3">
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn-hero-primary">
            Contact our team
          </a>
          <Link href="/features" className="btn-hero-secondary">
            See features
          </Link>
        </div>
      </PageHero>

      <TrustBar />

      <section className="mk-section">
        <div className="mk-container space-y-12">
          <Reveal className="text-center">
            <span className="hp-label">For your farm</span>
            <h2 className="section-title">How we walk with farmers</h2>
            <p className="section-lead">
              Real help for the work you do every day — from the field to the
              market.
            </p>
          </Reveal>

          {HELP_ROWS.map((row, i) => (
            <Reveal key={row.title} variant={i % 2 === 0 ? "left" : "right"}>
              <article className={`feature-row ${i % 2 === 1 ? "reverse" : ""}`}>
                <div className="feature-row-media">
                  <Image
                    src={row.photo.src}
                    alt={row.photo.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectPosition: row.photo.focus }}
                  />
                </div>
                <div className="feature-row-copy">
                  <h3 className="text-lg font-bold sm:text-xl">{row.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed">{row.copy}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mk-section !pt-4">
        <div className="mk-container">
          <Reveal variant="zoom">
            <div className="cta-split">
              <div className="cta-split__copy">
                <span className="hp-label !bg-white/15 !text-white">Join Ukulima Bora</span>
                <h2 className="section-title !text-white">
                  Choose how you take part
                </h2>
                <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-white/85">
                  Whether you grow, buy, supply inputs, or lend — there is a door
                  for you.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {ROLES.map((role) => (
                    <Link
                      key={role.href}
                      href={role.href}
                      className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--forest)]"
                    >
                      <role.Icon size={16} />
                      {role.title}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="cta-split__photo">
                <Image
                  src={PHOTOS.seedlingsSmile.src}
                  alt={PHOTOS.seedlingsSmile.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 40vw"
                  style={{ objectPosition: PHOTOS.seedlingsSmile.focus }}
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
