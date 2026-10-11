import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRightIcon } from "@/components/Icons";

/** Title row at the top of a portal screen. */
export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <h1 className="page-header__title">{title}</h1>
        {lead ? <p className="page-header__lead">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** One headline number with an icon; links through when `href` is set. */
export function StatCard({
  label,
  value,
  sub,
  Icon,
  href,
  tone = "leaf",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  Icon: ComponentType<{ size?: number }>;
  href?: string;
  tone?: "leaf" | "amber" | "sky" | "plum";
}) {
  const body = (
    <>
      <div className="stat-card__top">
        <span className={`stat-card__icon stat-card__icon--${tone}`}>
          <Icon size={20} />
        </span>
        {href ? <ArrowRightIcon size={16} className="stat-card__arrow" /> : null}
      </div>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {sub ? <p className="stat-card__sub">{sub}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="stat-card stat-card--link">
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}

/** White panel with an optional title row. */
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ui-card ${className}`}>
      {title || action ? (
        <div className="ui-card__head">
          {title ? <h2 className="ui-card__title">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The same tab row as FilterTabs, but each tab is its own page (keeps the sidebar and URL in sync). */
export function LinkTabs({
  label,
  current,
  items,
}: {
  label: string;
  /** href of the page being shown */
  current: string;
  items: { href: string; label: string; count?: number }[];
}) {
  return (
    <nav className="filter-tabs" aria-label={label}>
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
            {item.count !== undefined ? <span>{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tab-like filter row with counts, e.g. All 12 · Live 9 · Hidden 1. */
export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="filter-tabs" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "is-active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined ? <span>{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
