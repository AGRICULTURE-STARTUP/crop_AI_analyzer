"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How to use" },
    { href: "/#how-we-help", label: "For farmers" },
    { href: "/#ussd-demo", label: "Phone (USSD)" },
  ];

  return (
    <header className={`site-header ${scrolled || solid ? "scrolled" : ""}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="brand-mark text-white">
          Agri<span>Scan</span>
        </Link>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 text-white md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-xl leading-none">{open ? "✕" : "☰"}</span>
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link text-white">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="nav-link text-white">
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn !bg-white !py-2 !text-sm !text-[var(--leaf-deep)]"
          >
            Get started
          </Link>
        </nav>
      </div>

      {open ? (
        <nav className="flex flex-col gap-1 border-t border-white/15 bg-[rgba(27,94,32,0.98)] px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 text-sm font-normal text-white"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="py-2 text-sm font-normal text-white"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn mt-1 !bg-white !py-2 !text-sm !text-[var(--leaf-deep)]"
            onClick={() => setOpen(false)}
          >
            Get started
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
