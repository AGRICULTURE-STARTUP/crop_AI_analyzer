import Link from "next/link";
import { ArrowRightIcon, PinIcon } from "@/components/Icons";
import { formatKsh } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import type { StoreProduct } from "./types";

export function ProductCard({ product, href }: { product: StoreProduct; href: string }) {
  const price = formatKsh(product.price);
  return (
    <Link href={href} className="product-card">
      <div className="product-card__media">
        <ProductImage src={product.image} alt={product.name} category={product.category} />
        <span className="product-card__tag">{product.category_label}</span>
      </div>
      <div className="product-card__body">
        <p className="product-card__place">
          <PinIcon size={13} />
          {product.seller.county || "Kenya"}
        </p>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">
          {price ?? "Price on request"}
          {price && product.unit ? <span> / {product.unit}</span> : null}
        </p>
      </div>
      <div className="product-card__foot">
        <span className="truncate">{product.seller.name}</span>
        <ArrowRightIcon size={16} />
      </div>
    </Link>
  );
}
