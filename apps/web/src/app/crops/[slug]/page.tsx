import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CropProfile } from "@/features/advisor/CropProfile";

type Props = { params: Promise<{ slug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/v1/recommend/crops/${encodeURIComponent(slug)}/`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { title: "Crop" };
    const { crop } = (await res.json()) as { crop: { name: string; name_sw: string } };
    const sw = crop.name_sw && crop.name_sw !== crop.name ? ` (${crop.name_sw})` : "";
    return {
      title: `${crop.name}${sw} — growing conditions`,
      description: `Soil nutrients, pH, temperature, humidity and rainfall that ${crop.name.toLowerCase()} grew in across 100 field records.`,
      alternates: { canonical: `/crops/${slug}` },
    };
  } catch {
    return { title: "Crop" };
  }
}

export default async function CropPage({ params }: Props) {
  const { slug } = await params;
  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[80rem] px-4 pb-20 pt-8 sm:px-6">
        <CropProfile slug={slug} basePath="/crops" advisorHref="/crop-advisor" />
      </main>
      <SiteFooter />
    </div>
  );
}
