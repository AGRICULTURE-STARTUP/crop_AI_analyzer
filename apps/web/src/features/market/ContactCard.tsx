import { CallIcon, MessageIcon, PinIcon } from "@/components/Icons";
import { initialsOf, intlPhone } from "@/lib/format";

/** A buyer or farmer in a directory: avatar, name, place, crops and contact buttons. */
export function ContactCard({
  name,
  subtitle,
  place,
  photo,
  phone,
  email,
  tags = [],
  badge,
  whatsappText,
}: {
  name: string;
  subtitle?: string;
  place?: string;
  photo?: string | null;
  phone?: string;
  email?: string;
  tags?: string[];
  badge?: string;
  whatsappText?: string;
}) {
  const intl = intlPhone(phone);
  return (
    <article className="contact-card">
      <div className="flex items-start gap-3">
        {photo ? (
          // Profile photos are served from the API host.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="contact-card__photo" />
        ) : (
          <span className="avatar avatar--light contact-card__avatar" aria-hidden>
            {initialsOf(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="contact-card__name">{name}</h3>
            {badge ? <span className="badge badge-ok shrink-0">{badge}</span> : null}
          </div>
          {subtitle ? <p className="contact-card__sub">{subtitle}</p> : null}
          {place ? (
            <p className="contact-card__place">
              <PinIcon size={13} /> {place}
            </p>
          ) : null}
        </div>
      </div>
      {tags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map((t) => (
            <span key={t} className="chip">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="contact-card__actions">
        {intl ? (
          <>
            <a href={`tel:+${intl}`} className="btn btn-secondary btn-sm">
              <CallIcon size={14} /> Call
            </a>
            <a
              href={`https://wa.me/${intl}${whatsappText ? `?text=${encodeURIComponent(whatsappText)}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <MessageIcon size={14} /> WhatsApp
            </a>
          </>
        ) : null}
        {email ? (
          <a href={`mailto:${email}`} className="btn btn-ghost btn-sm">
            Email
          </a>
        ) : null}
        {!intl && !email ? <span className="text-xs text-[var(--muted)]">No contact listed</span> : null}
      </div>
    </article>
  );
}
