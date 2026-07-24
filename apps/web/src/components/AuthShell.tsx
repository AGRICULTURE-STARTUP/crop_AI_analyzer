import { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

type Props = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
};

/** Shared split layout for login / signup — farm photo + form panel. */
export function AuthShell({ children, eyebrow, title, subtitle }: Props) {
  return (
    <div className="auth-page">
      <SiteHeader solid />
      <div className="auth-page__inner">
        <aside className="auth-hero" aria-hidden={false}>
          <div className="auth-hero__overlay" />
          <div className="auth-hero__content">
            {eyebrow ? <span className="auth-hero__eyebrow">{eyebrow}</span> : null}
            <h1 className="auth-hero__title">{title}</h1>
            <p className="auth-hero__subtitle">{subtitle}</p>
          </div>
        </aside>
        <div className="auth-form-wrap animate-rise">{children}</div>
      </div>
    </div>
  );
}
