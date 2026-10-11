/**
 * One input on a fixed scale: full record range (track), middle 80% (band),
 * average (tick) and, optionally, the farmer's own value (dot).
 */
export function RangeBar({
  scale,
  band,
  mean,
  value,
  status,
  label,
}: {
  scale: [number, number];
  band: [number, number];
  mean?: number;
  value?: number;
  status?: "low" | "ok" | "high";
  label: string;
}) {
  const [lo, hi] = scale;
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo || 1)) * 100))}%`;
  const bandLeft = Math.min(100, Math.max(0, ((band[0] - lo) / (hi - lo || 1)) * 100));
  const bandRight = Math.min(100, Math.max(0, ((band[1] - lo) / (hi - lo || 1)) * 100));
  return (
    <div className="range" role="img" aria-label={label}>
      <div className="range__band" style={{ left: `${bandLeft}%`, width: `${Math.max(1.5, bandRight - bandLeft)}%` }} />
      {mean !== undefined ? <div className="range__mean" style={{ left: pct(mean) }} /> : null}
      {value !== undefined ? (
        <div className={`range__value is-${status || "ok"}`} style={{ left: pct(value) }} />
      ) : null}
    </div>
  );
}
