"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { CameraIcon, PinIcon } from "@/components/Icons";

export type ProfileStat = { label: string; value: ReactNode; href?: string; hint?: string };

/**
 * Top card of a profile page: banner, photo (tap the camera to change it), name, place, actions and
 * an optional row of headline numbers. Shared by the farmer and buyer profiles.
 */
export function ProfileHeader({
  eyebrow,
  name,
  badge,
  meta,
  place,
  chips = [],
  initials,
  photoUrl,
  photoBusy,
  onPhoto,
  actions,
  stats,
}: {
  eyebrow: string;
  name: string;
  badge?: string;
  /** Line under the name, e.g. "@username · Farm name". */
  meta?: string;
  place?: string;
  chips?: string[];
  initials: string;
  photoUrl: string | null;
  photoBusy: boolean;
  onPhoto: (file: File) => void;
  actions?: ReactNode;
  stats?: ProfileStat[];
}) {
  const inputId = useId();

  return (
    <section className="profile-card">
      <div className="profile-card__banner" aria-hidden />
      <div className="profile-card__body">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {photoUrl ? (
              // Photos are served from the API host, so next/image would need per-host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={`${name}'s photo`} className="profile-avatar__img" />
            ) : (
              <span className="profile-avatar__initials" aria-hidden>
                {initials}
              </span>
            )}
            {photoBusy ? <span className="profile-avatar__busy" role="status" aria-label="Uploading photo" /> : null}
          </div>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={photoBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPhoto(file);
              e.target.value = "";
            }}
          />
          <label htmlFor={inputId} className="profile-avatar__cam" title={photoUrl ? "Change photo" : "Add a photo"}>
            <CameraIcon size={15} />
            <span className="sr-only">{photoUrl ? "Change photo" : "Add a photo"}</span>
          </label>
        </div>

        <div className="profile-card__id">
          <p className="profile-card__eyebrow">{eyebrow}</p>
          <h1 className="profile-card__name">
            {name}
            {badge ? <span className="badge badge-ok badge--plain">{badge}</span> : null}
          </h1>
          {meta ? <p className="profile-card__meta">{meta}</p> : null}
          {place ? (
            <p className="profile-card__place">
              <PinIcon size={14} /> {place}
            </p>
          ) : null}
          {chips.length ? (
            <div className="profile-card__chips">
              {chips.map((c) => (
                <span key={c} className="profile-chip">
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {actions ? <div className="profile-card__actions">{actions}</div> : null}
      </div>

      {stats?.length ? (
        <ul className="profile-stats">
          {stats.map((s) => {
            const body = (
              <>
                <span className="profile-stat__label">{s.label}</span>
                <strong className="profile-stat__value">{s.value}</strong>
                {s.hint ? <small>{s.hint}</small> : null}
              </>
            );
            return (
              <li key={s.label}>
                {s.href ? (
                  <Link href={s.href} className="profile-stat profile-stat--link">
                    {body}
                  </Link>
                ) : (
                  <div className="profile-stat">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
