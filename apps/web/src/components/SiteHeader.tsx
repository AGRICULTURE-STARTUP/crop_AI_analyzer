"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { CloseIcon, MenuIcon } from "@/components/Icons";
import { roleHome } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/crop-advisor", label: "Crop advisor" },
  { href: "/about", label: "About us" },
];

/** Public site header. `solid` and `withAnnouncement` only change what sits above it. */
export function SiteHeader({
  withAnnouncement = false,
}: {
  solid?: boolean;
  withAnnouncement?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const portalHref = user ? roleHome(user.role) : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A link is "current" only when it points at the page itself, not a section.
  const isCurrent = (href: string) =>
    !href.includes("#") && (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {withAnnouncement ? (
        <div className="announce">
          <div className="announce__inner">
            <div>
              <p className="announce__title">Protect your crops · Grow your yield</p>
              <p className="announce__text hidden sm:block">
                Snap a sick plant, get treatment advice in English or Kiswahili.
              </p>
            </div>
            <Link href="/signup?role=farmer" className="btn btn-pill btn-outline-light">
              Start scanning
            </Link>
          </div>
        </div>
      ) : null}

      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-6 md:py-3">
          <Link href="/" className="brand-logo-link" aria-label="Ukulima Bora home">
            <BrandLogo className="brand-logo brand-logo--header" alt="" />
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line-strong)] text-ink md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {LINKS.map((link) => {
              const current = isCurrent(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${current ? "is-active" : ""}`}
                  aria-current={current ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            {portalHref ? (
              <Link href={portalHref} className="btn btn-pill btn-primary !py-2">
                My portal
              </Link>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-pill btn-primary !py-2">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>

        {open ? (
          <nav
            className="animate-rise flex flex-col gap-1 border-t border-[var(--line)] bg-white px-4 py-3 md:hidden"
            aria-label="Main"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-mist ${
                  isCurrent(link.href) ? "text-leaf-deep" : "text-ink"
                }`}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {portalHref ? (
              <Link
                href={portalHref}
                className="btn btn-pill btn-primary mt-1"
                onClick={() => setOpen(false)}
              >
                My portal
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink hover:bg-mist"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="btn btn-pill btn-primary mt-1"
                  onClick={() => setOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        ) : null}
      </header>
    </>
  );
}
