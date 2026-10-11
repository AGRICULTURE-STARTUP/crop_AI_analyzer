import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Photo } from "@/lib/photos";

/** Banner at the top of inner public pages (Features, About us). */
export function PageHero({
  crumb,
  eyebrow,
  title,
  lead,
  photo,
  children,
}: {
  crumb: string;
  eyebrow: string;
  title: string;
  lead: string;
  photo: Photo;
  children?: ReactNode;
}) {
  return (
    <section className="hero-premium hero-premium--page">
      <div className="hero-premium__bg" aria-hidden />
      <div className="hero-premium__inner">
        <div>
          <nav aria-label="Breadcrumb" className="crumb animate-rise">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{crumb}</span>
          </nav>
          <span className="hero-eyebrow animate-rise delay-1">{eyebrow}</span>
          <h1 className="hero-title animate-rise delay-2">{title}</h1>
          <p className="hero-description animate-rise delay-3">{lead}</p>
          {children ? <div className="animate-rise delay-4">{children}</div> : null}
        </div>
        <div className="hero-photo animate-rise delay-2">
          <div className="hero-photo__frame">
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              priority
              sizes="(max-width: 960px) 100vw, 480px"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
