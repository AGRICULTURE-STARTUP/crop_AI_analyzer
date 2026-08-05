import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How AgriScan processes crop images, chat messages, farm profiles, and Farm Health Scores — and your rights over that data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper px-4 pb-16 pt-28">
      <SiteHeader solid />
      <article className="panel mx-auto mt-8 max-w-3xl rounded-3xl p-6 sm:p-10">
        <h1 className="brand-mark text-4xl text-leaf-deep">Privacy policy</h1>
        <p className="mt-4 text-ink/70">
          AgriScan processes crop images, chat messages, and farm profile data to
          deliver disease diagnosis, advisory, and optional Farm Health Score
          sharing with lenders you consent to.
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-ink/70">
          <li>Scan images are used for inference and may be logged as scan results.</li>
          <li>Wallet and M-Pesa top-ups are handled via Safaricom Daraja.</li>
          <li>Lending partners only receive scores for farmers who opt in.</li>
          <li>You can request account deletion by contacting support.</li>
        </ul>
        <Link href="/" className="btn btn-secondary mt-8 inline-flex">
          Back home
        </Link>
      </article>
    </div>
  );
}
