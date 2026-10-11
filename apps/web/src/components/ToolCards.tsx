import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { Reveal } from "@/components/Reveal";
import { TOOLS } from "@/lib/content";

/** Two large cards that send visitors to the crop advisor and the marketplace. */
export function ToolCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {TOOLS.map((tool, i) => (
        <Reveal key={tool.href} delay={i * 120} className="h-full">
          <Link href={tool.href} className="tool-card">
            <div className="tool-card__photo">
              <Image
                src={tool.photo.src}
                alt={tool.photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 560px"
                style={{ objectPosition: tool.photo.focus }}
              />
              <span className="tool-card__icon" aria-hidden>
                <tool.Icon size={22} />
              </span>
            </div>
            <div className="tool-card__body">
              <span className="hp-label">{tool.eyebrow}</span>
              <h3 className="tool-card__title">{tool.title}</h3>
              <p className="tool-card__copy">{tool.copy}</p>
              <span className="tool-card__cta">
                {tool.cta} <ArrowRightIcon size={16} />
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
