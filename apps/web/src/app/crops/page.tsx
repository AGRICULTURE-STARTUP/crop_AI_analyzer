import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CropLibrary } from "@/features/advisor/CropLibrary";

export const metadata: Metadata = {
  title: "Crop library — growing conditions for 22 crops",
  description:
    "Soil nutrients, pH, temperature, humidity and rainfall that 22 crops grew in, from 2,200 field records.",
  alternates: { canonical: "/crops" },
};

export default function CropsPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[80rem] px-4 pb-20 pt-10 sm:px-6">
        <CropLibrary basePath="/crops" advisorHref="/crop-advisor" />
      </main>
      <SiteFooter />
    </div>
  );
}
