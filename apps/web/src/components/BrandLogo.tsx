/**
 * Official Ukulima Bora mark from image 1.
 * Artwork is unchanged; only empty canvas was cropped for display size.
 * Use `onDark` on dark surfaces (footer / dark sidebar) so the white
 * export background does not show as a padded box.
 */
export const BRAND_LOGO_SRC = "/UkulimaBoraagritechlogo/logo.png";
export const BRAND_LOGO_ON_DARK_SRC = "/UkulimaBoraagritechlogo/logo-on-dark.png";
/** Favicon uses sized PNGs from image 2 (see public/UkulimaBoraagritechlogo/favicon-*.png). */
export const BRAND_FAVICON_SRC = "/UkulimaBoraagritechlogo/favicon-32.png";

type BrandLogoProps = {
  className?: string;
  /** Accessible name; omit when the parent link already has an aria-label. */
  alt?: string;
  /** Transparent-background mark for dark UI chrome. */
  onDark?: boolean;
};

export function BrandLogo({
  className = "brand-logo",
  alt = "Ukulima Bora",
  onDark = false,
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official brand mark; must not be processed
    <img
      src={onDark ? BRAND_LOGO_ON_DARK_SRC : BRAND_LOGO_SRC}
      alt={alt}
      className={className}
      decoding="async"
    />
  );
}
