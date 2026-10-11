import { TRUST } from "@/lib/content";

/** Four headline facts in a white card that straddles the hero's lower edge. */
export function TrustBar() {
  return (
    <div className="trust-bar animate-rise delay-3">
      <ul className="trust-bar__card">
        {TRUST.map((item) => (
          <li key={item.label} className="trust-item">
            <span className="trust-icon" aria-hidden>
              <item.Icon size={22} />
            </span>
            <span className="trust-text">
              <span className="trust-num">{item.num}</span>
              <span className="trust-label">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
