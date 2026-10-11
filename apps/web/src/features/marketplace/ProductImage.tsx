import type { ComponentType } from "react";
import {
  FlaskIcon,
  ShieldIcon,
  SproutIcon,
  StoreIcon,
  WrenchIcon,
} from "@/components/Icons";

const CATEGORY_LOOK: Record<string, { Icon: ComponentType<{ size?: number }>; tone: string }> = {
  fertiliser: { Icon: FlaskIcon, tone: "tone-leaf" },
  seed: { Icon: SproutIcon, tone: "tone-amber" },
  pesticide: { Icon: ShieldIcon, tone: "tone-sky" },
  equipment: { Icon: WrenchIcon, tone: "tone-stone" },
  other: { Icon: StoreIcon, tone: "tone-plum" },
};

/** Product photo on white, or a category illustration when the seller has not added one. */
export function ProductImage({
  src,
  alt,
  category,
  className = "",
}: {
  src: string | null;
  alt: string;
  category: string;
  className?: string;
}) {
  if (src) {
    return (
      // Seller uploads live on the API host, so next/image would need per-host config.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" className={`product-img ${className}`} />
    );
  }
  const look = CATEGORY_LOOK[category] || CATEGORY_LOOK.other;
  return (
    <div className={`product-img product-img--empty ${look.tone} ${className}`} role="img" aria-label={alt}>
      <look.Icon size={44} />
    </div>
  );
}
