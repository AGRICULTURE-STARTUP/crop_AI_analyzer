import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CropAdvisor } from "@/features/advisor/CropAdvisor";

export const metadata: Metadata = {
  title: "Crop advisor — find the best crop for your soil",
  description:
    "Enter your soil test (N, P, K, pH) and weather to see which of 22 crops suits your field, in English or Kiswahili.",
  alternates: { canonical: "/crop-advisor" },
};

export default function CropAdvisorPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[80rem] px-4 pb-20 pt-6 sm:px-6">
        <CropAdvisor mode="public" />
      </main>
      <SiteFooter />
    </div>
  );
}
