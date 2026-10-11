import Image from "next/image";
import { SproutIcon } from "@/components/Icons";
import type { CropMeta } from "./types";

/** Crop photo (from the Panda Smart project) or a leaf placeholder when there is none. */
export function CropImage({
  crop,
  sizes,
  className = "",
  priority = false,
}: {
  crop: Pick<CropMeta, "image" | "name">;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`crop-img ${className}`}>
      {crop.image ? (
        <Image src={crop.image} alt={crop.name} fill sizes={sizes} priority={priority} />
      ) : (
        <div className="crop-img__empty" role="img" aria-label={crop.name}>
          <SproutIcon size={40} />
        </div>
      )}
    </div>
  );
}
