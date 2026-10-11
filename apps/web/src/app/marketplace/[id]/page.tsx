import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductDetail } from "@/features/marketplace/ProductDetail";

type Props = { params: Promise<{ id: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/v1/store/products/${encodeURIComponent(id)}/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: "Product" };
    const { product } = (await res.json()) as {
      product: { name: string; description: string; seller: { name: string; county: string } };
    };
    return {
      title: `${product.name} — ${product.seller.name}`,
      description:
        product.description?.slice(0, 155) ||
        `${product.name} from ${product.seller.name}, ${product.seller.county}. Contact the seller on AgriScan.`,
      alternates: { canonical: `/marketplace/${id}` },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function MarketplaceProductPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[80rem] px-4 pb-20 pt-8 sm:px-6">
        <ProductDetail id={id} basePath="/marketplace" />
      </main>
      <SiteFooter />
    </div>
  );
}
