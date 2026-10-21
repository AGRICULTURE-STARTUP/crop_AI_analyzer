"use client";

import type { MissingItem } from "./completeness";

/** "Profile 67% complete" with one button per missing item; each opens the right field. */
export function StrengthCard({
  percent,
  missing,
  onPick,
}: {
  percent: number;
  missing: MissingItem[];
  onPick: (field: MissingItem["field"]) => void;
}) {
  if (missing.length === 0) return null;
  return (
    <section className="strength" aria-label="Profile strength">
      <div className="strength__top">
        <p className="strength__title">
          Your profile is <strong>{percent}%</strong> complete
        </p>
        <p className="strength__lead">A full profile gives you local weather and better crop advice.</p>
      </div>
      <div
        className="strength__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Profile completeness"
      >
        <span style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
      <ul className="strength__todo">
        {missing.map((m) => (
          <li key={m.key}>
            <button type="button" onClick={() => onPick(m.field)}>
              <span aria-hidden>+</span> {m.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
