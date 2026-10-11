"use client";

import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Milliseconds to wait before the reveal starts (use for staggering). */
  delay?: number;
  variant?: "up" | "left" | "right" | "zoom";
  as?: "div" | "li" | "article" | "section";
};

/** Fades and slides its children in once, the first time they scroll into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
  as = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return createElement(
    as,
    {
      ref,
      className: `reveal ${variant === "up" ? "" : `reveal--${variant}`} ${className}`.trim(),
      style,
    },
    children
  );
}
