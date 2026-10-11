"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { AgriBotWidget } from "@/components/AgriBotWidget";
import {
  AppsIcon,
  BankIcon,
  BasketIcon,
  ChartIcon,
  ChatIcon,
  ChevronDownIcon,
  CloseIcon,
  CoinsIcon,
  DocIcon,
  ExternalIcon,
  GridIcon,
  KeyIcon,
  LogoutIcon,
  MenuIcon,
  ScanIcon,
  SearchIcon,
  SproutIcon,
  StoreIcon,
  UserIcon,
  UsersIcon,
} from "@/components/Icons";
import { useInstalledNav } from "@/features/modules/hooks";
import { openAgriBot } from "@/lib/agribot";
import { roleHome } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initialsOf } from "@/lib/format";
import type { UserRole } from "@/lib/types";

type NavLeaf = { href: string; label: string };

type NavItem = {
  label: string;
  Icon: ComponentType<{ size?: number }>;
  /** A route inside the app. */
  href?: string;
  /** Runs instead of navigating (e.g. opens AgriBot). */
  action?: () => void;
  /** Sub-pages: the item opens as a dropdown instead of navigating. */
  children?: NavLeaf[];
};

type NavGroup = { label: string; items: NavItem[] };

const NAV: Record<string, NavGroup[]> = {
  farmer: [
    {
      label: "Farm",
      items: [
        { href: "/farmer/dashboard", label: "Dashboard", Icon: GridIcon },
        { href: "/farmer/scan", label: "Scan crops", Icon: ScanIcon },
        { label: "AgriBot", Icon: ChatIcon, action: () => openAgriBot() },
      ],
    },
    // Filled at runtime with the farmer's installed modules (see features/modules).
    { label: "My apps", items: [{ href: "/farmer/apps", label: "App store", Icon: AppsIcon }] },
    {
      label: "Market",
      items: [
        { href: "/farmer/marketplace", label: "Marketplace", Icon: StoreIcon },
        { href: "/farmer/market", label: "Prices & buyers", Icon: BasketIcon },
      ],
    },
    {
      label: "Account",
      items: [{ href: "/farmer/profile", label: "Profile & wallet", Icon: UserIcon }],
    },
  ],
  buyer: [
    {
      label: "Market",
      items: [{ href: "/buyer/dashboard", label: "Dashboard", Icon: GridIcon }],
    },
    {
      label: "Account",
      items: [{ href: "/buyer/profile", label: "Profile", Icon: UserIcon }],
    },
  ],
  agency: [
    {
      label: "Store",
      items: [
        { href: "/agency/dashboard", label: "My products", Icon: StoreIcon },
        { href: "/marketplace", label: "View marketplace", Icon: ExternalIcon },
      ],
    },
    // Filled at runtime with the agency's installed modules (e.g. Shop POS).
    { label: "My apps", items: [{ href: "/agency/apps", label: "App store", Icon: AppsIcon }] },
  ],
  lender: [
    {
      label: "Lending",
      items: [
        { href: "/lender/dashboard", label: "Overview", Icon: GridIcon },
        { href: "/lender/score-lookup", label: "Score lookup", Icon: SearchIcon },
        { href: "/lender/usage", label: "Usage", Icon: ChartIcon },
      ],
    },
    {
      label: "Developers",
      items: [
        { href: "/lender/api-keys", label: "API keys", Icon: KeyIcon },
        { href: "/lender/docs", label: "Docs", Icon: DocIcon },
      ],
    },
  ],
  admin: [
    {
      label: "Overview",
      items: [{ href: "/admin/dashboard", label: "Dashboard", Icon: GridIcon }],
    },
    {
      label: "Manage",
      items: [
        { href: "/admin/users", label: "Users", Icon: UsersIcon },
        { href: "/admin/lenders", label: "Lenders", Icon: BankIcon },
        { href: "/admin/marketplace", label: "Marketplace", Icon: StoreIcon },
        { href: "/admin/modules", label: "App store", Icon: AppsIcon },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: "/admin/revenue", label: "Revenue", Icon: CoinsIcon },
        { href: "/admin/recommendations", label: "Crop advisor", Icon: SproutIcon },
      ],
    },
  ],
};

const PORTAL_NAME: Record<string, string> = {
  farmer: "Farmer portal",
  buyer: "Buyer portal",
  agency: "Agency portal",
  lender: "Lender portal",
  admin: "Admin console",
};

function isActive(pathname: string, href?: string) {
  return !!href && (pathname === href || pathname.startsWith(`${href}/`));
}

/** The sub-page that owns the current route: the longest matching href wins. */
function activeChild(pathname: string, children: NavLeaf[]) {
  return children
    .filter((c) => isActive(pathname, c.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** A sidebar entry with sub-pages. Opens by itself when one of them is the current page. */
function NavDropdown({ item, pathname }: { item: NavItem; pathname: string }) {
  const listId = useId();
  const current = activeChild(pathname, item.children ?? []);
  const [open, setOpen] = useState(Boolean(current));
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (current) setOpen(true);
  }

  return (
    <li>
      <button
        type="button"
        className={`app-nav__link app-nav__toggle ${current ? "has-active" : ""}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <item.Icon size={19} />
        <span>{item.label}</span>
        <ChevronDownIcon size={15} className="app-nav__chevron" />
      </button>
      <ul id={listId} className="app-nav__sub" hidden={!open}>
        {item.children?.map((child) => {
          const active = child.href === current;
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                className={`app-nav__sublink ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {child.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** Signed-in layout for every role: sidebar navigation, top bar, content. */
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
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const installed = useInstalledNav();
  // Installed modules slot in above the App store link in "My apps".
  const groups: NavGroup[] = (NAV[role] || []).map((group) =>
    group.label === "My apps"
      ? {
          ...group,
          items: [
            ...installed.map(({ href, label, Icon, children }): NavItem => ({ href, label, Icon, children })),
            ...group.items,
          ],
        }
      : group
  );

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

  // Close the mobile drawer on navigation; Escape closes it too.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center text-leaf">
        Loading…
      </div>
    );
  }

  const profile = (user.profile || {}) as Record<string, unknown>;
  const displayName =
    (typeof profile.agency_name === "string" && profile.agency_name) ||
    (typeof profile.organization_name === "string" && profile.organization_name) ||
    [user.user.first_name, user.user.last_name].filter(Boolean).join(" ") ||
    user.user.username;
  const walletBalance = role === "farmer" ? user.wallet?.balance : null;

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="app-shell">
      <aside
        id="portal-sidebar"
        className={`app-sidebar ${open ? "is-open" : ""}`}
        aria-label={`${PORTAL_NAME[role] || "Portal"} navigation`}
      >
        <div className="app-sidebar__brand">
          <div>
            <Link href="/" className="wordmark wordmark--light text-[1.45rem]" aria-label="AgriScan home">
              Agri<span>Scan</span>
            </Link>
            <p className="app-sidebar__role">{PORTAL_NAME[role] || "Portal"}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="app-sidebar__close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <nav className="app-nav">
          {groups.map((group) => (
            <div key={group.label} className="app-nav__group">
              <p className="app-nav__label">{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  if (item.children?.length) {
                    return <NavDropdown key={item.label} item={item} pathname={pathname} />;
                  }
                  const active = isActive(pathname, item.href);
                  const body = (
                    <>
                      <item.Icon size={19} />
                      <span>{item.label}</span>
                    </>
                  );
                  return (
                    <li key={item.label}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className={`app-nav__link ${active ? "is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                        >
                          {body}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="app-nav__link"
                          onClick={() => {
                            setOpen(false);
                            item.action?.();
                          }}
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="app-sidebar__foot">
          <span className="avatar" aria-hidden>
            {initialsOf(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-white/55">{user.user.email || user.user.username}</p>
          </div>
          <button
            type="button"
            className="app-sidebar__logout"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogoutIcon size={18} />
          </button>
        </div>
      </aside>

      {open ? (
        <div className="app-backdrop" onClick={() => setOpen(false)} aria-hidden />
      ) : null}

      <div className="app-body">
        <header className="app-topbar">
          <button
            type="button"
            className="app-topbar__menu"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="portal-sidebar"
          >
            <MenuIcon size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="app-topbar__crumb">{PORTAL_NAME[role] || "Portal"}</p>
            <p className="app-topbar__title truncate">{title}</p>
          </div>
          {walletBalance != null ? (
            <Link href="/farmer/profile" className="wallet-chip" title="Wallet balance">
              KSh {walletBalance}
            </Link>
          ) : null}
          <Link href="/" className="app-topbar__site" title="Open the public website">
            <ExternalIcon size={16} />
            <span className="hidden sm:inline">Website</span>
          </Link>
        </header>

        <main className="app-main">{children}</main>
      </div>

      {role === "farmer" ? <AgriBotWidget /> : null}
    </div>
  );
}
