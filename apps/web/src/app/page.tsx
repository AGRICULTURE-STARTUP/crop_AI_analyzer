import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const ROLES = [
  {
    href: "/signup/farmer",
    title: "Farmers",
    copy: "Scan leaves, ask AgriBot, and build a Farm Health Score.",
  },
  {
    href: "/signup/buyer",
    title: "Buyers",
    copy: "Discover produce listings and connect with growers near you.",
  },
  {
    href: "/signup/agency",
    title: "Input agencies",
    copy: "List fertiliser, seed, and crop protection for local farmers.",
  },
  {
    href: "/signup/lender",
    title: "Lenders",
    copy: "Self-serve API keys for Farm Health Score underwriting.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="hero-grid relative min-h-[100svh] px-4 pb-16 pt-28 md:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(31,107,58,0.18),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="animate-rise space-y-6">
            <p className="brand-mark text-5xl leading-[0.95] text-leaf-deep sm:text-6xl md:text-7xl lg:text-8xl">
              AgriScan
            </p>
            <h1 className="max-w-xl text-2xl font-semibold leading-tight text-ink/90 sm:text-3xl">
              Crop intelligence that fits in a farmer&apos;s pocket.
            </h1>
            <p className="max-w-md text-base text-ink/70 sm:text-lg">
              Diagnose disease from a leaf photo, get practical advice in English
              or Kiswahili, and share a consent-based Farm Health Score with
              lenders who fund growth.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/signup/farmer" className="btn btn-primary">
                Start as a farmer
              </Link>
              <Link href="/signup/lender" className="btn btn-secondary">
                Lending partner signup
              </Link>
            </div>
          </div>

          <div className="animate-drift relative mx-auto w-full max-w-md">
            <div className="panel relative overflow-hidden rounded-[2rem] p-6 shadow-[0_30px_80px_rgba(15,61,36,0.18)]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sprout/30 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-sun/25 blur-2xl" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
                Live on Contabo API
              </p>
              <p className="brand-mark mt-3 text-3xl text-leaf-deep">
                Scan → Score → Finance
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink/75">
                <li className="rounded-2xl bg-white/70 px-4 py-3">
                  MobileNet crop models with plant gatekeeper
                </li>
                <li className="rounded-2xl bg-white/70 px-4 py-3">
                  AgriBot grounded on extension PDFs
                </li>
                <li className="rounded-2xl bg-white/70 px-4 py-3">
                  M-Pesa wallet + lender API keys
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-8 max-w-xl">
          <h2 className="brand-mark text-3xl text-leaf-deep sm:text-4xl">
            One product, four doors
          </h2>
          <p className="mt-2 text-ink/65">
            Pick the portal that matches how you work with AgriScan.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              className="panel group rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-semibold text-leaf-deep group-hover:text-leaf">
                {role.title}
              </h3>
              <p className="mt-2 text-sm text-ink/65">{role.copy}</p>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-ink/50">
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy policy
          </Link>
        </p>
      </section>
    </div>
  );
}
