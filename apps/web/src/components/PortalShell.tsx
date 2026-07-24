"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { roleHome } from "@/lib/api";

type NavItem = { href: string; label: string };

const NAV: Record<string, NavItem[]> = {
  farmer: [
    { href: "/farmer/scan", label: "Scan" },
    { href: "/farmer/chat", label: "AgriBot" },
    { href: "/farmer/inputs", label: "Inputs" },
    { href: "/farmer/market", label: "Market" },
    { href: "/farmer/profile", label: "Profile" },
  ],
  buyer: [{ href: "/buyer/dashboard", label: "Dashboard" }],
  agency: [{ href: "/agency/dashboard", label: "Products" }],
  lender: [
    { href: "/lender/dashboard", label: "Overview" },
    { href: "/lender/api-keys", label: "API keys" },
    { href: "/lender/score-lookup", label: "Score lookup" },
    { href: "/lender/docs", label: "Docs" },
  ],
  admin: [
    { href: "/admin/revenue", label: "Revenue" },
    { href: "/admin/lenders", label: "Lenders" },
  ],
};

export function PortalShell({
  role,
  title,
  children,
}: {
  role: UserRole;
  title: string;
  children: ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const items = NAV[role] || [];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== role) {
      router.replace(roleHome(user.role));
    }
  }, [loading, user, role, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-leaf">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(244,247,241,0.88)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="brand-mark text-xl text-leaf-deep">
              AgriScan
            </Link>
            <nav className="hidden gap-1 md:flex">
              {items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                      active
                        ? "bg-leaf text-white"
                        : "text-ink/70 hover:bg-white/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink/60 sm:inline">{title}</span>
            <button
              className="btn btn-secondary !px-3 !py-1.5 text-sm"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-[var(--line)] px-4 py-2 md:hidden">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                  active ? "bg-leaf text-white" : "bg-white/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
