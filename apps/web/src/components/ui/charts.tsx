/**
 * Small dependency-free SVG charts (admin console, Shop POS, …). Shapes stretch with
 * the container (viewBox + preserveAspectRatio="none"); labels are HTML so the
 * text never distorts. Each bar/day carries a native tooltip.
 */

/** One value per day; `date` is YYYY-MM-DD. */
export type SeriesPoint = { date: string; value: number };

const W = 600;
const H = 200;

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

export type ChartSeries = { label: string; color: string; points: SeriesPoint[] };

/** Monotone cubic path (no overshoot below zero), same idea as d3's curveMonotoneX. */
function smoothPath(points: [number, number][]) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0][0]},${points[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    m[i] = (points[i + 1][1] - points[i][1]) / (dx[i] || 1);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      const common = dx[i - 1] + dx[i];
      t[i] = (3 * common) / ((common + dx[i]) / m[i - 1] + (common + dx[i - 1]) / m[i]);
    }
  }
  t[n - 1] = m[n - 2];
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${x0 + h},${y0 + t[i] * h} ${x1 - h},${y1 - t[i + 1] * h} ${x1},${y1}`;
  }
  return d;
}

export function AreaChart({
  series,
  format = (n) => String(n),
  height = 180,
}: {
  series: ChartSeries[];
  format?: (n: number) => string;
  height?: number;
}) {
  const days = series[0]?.points ?? [];
  const n = Math.max(1, days.length - 1);
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H - (v / max) * (H - 8) - 4;
  const summary = series
    .map((s) => `${s.label}: ${s.points.reduce((a, p) => a + p.value, 0)} in ${s.points.length} days`)
    .join("; ");

  return (
    <figure className="chart" aria-label={summary} role="img">
      <div className="chart__plot" style={{ height }}>
        <div className="chart__grid" aria-hidden>
          {[max, max / 2, 0].map((v) => (
            <span key={v}>
              <em>{format(v)}</em>
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart__svg" aria-hidden>
          {series.map((s, index) => {
            const line = smoothPath(s.points.map((p, i) => [x(i), y(p.value)] as [number, number]));
            return (
              <g key={s.label}>
                {/* Only the first series gets a fill so overlapping areas stay readable. */}
                {index === 0 ? <path d={`${line} L${W},${H} L0,${H} Z`} fill={s.color} opacity={0.1} /> : null}
                <path
                  d={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.25}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {days.map((d, i) => (
            <rect key={d.date} x={x(i) - W / n / 2} y={0} width={W / n} height={H} fill="transparent">
              <title>
                {shortDate(d.date)}: {series.map((s) => `${s.label} ${format(s.points[i]?.value ?? 0)}`).join(", ")}
              </title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="chart__x" aria-hidden>
        <span>{days[0] ? shortDate(days[0].date) : ""}</span>
        <span>{days[Math.floor(days.length / 2)] ? shortDate(days[Math.floor(days.length / 2)].date) : ""}</span>
        <span>{days.length ? shortDate(days[days.length - 1].date) : ""}</span>
      </div>
      {series.length > 1 ? (
        <figcaption className="chart__legend">
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function BarChart({
  points,
  color = "var(--leaf-500)",
  format = (n) => String(n),
  label,
  height = 170,
}: {
  points: SeriesPoint[];
  color?: string;
  format?: (n: number) => string;
  label: string;
  height?: number;
}) {
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const slot = W / Math.max(1, points.length);
  const total = points.reduce((a, p) => a + p.value, 0);
  return (
    <figure className="chart" role="img" aria-label={`${label}: ${format(total)} over ${points.length} days`}>
      <div className="chart__plot" style={{ height }}>
        <div className="chart__grid" aria-hidden>
          {[max, max / 2, 0].map((v) => (
            <span key={v}>
              <em>{format(v)}</em>
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart__svg" aria-hidden>
          {points.map((p, i) => {
            const h = (p.value / max) * (H - 4);
            return (
              <rect
                key={p.date}
                x={i * slot + slot * 0.18}
                y={H - h}
                width={slot * 0.64}
                height={Math.max(h, p.value > 0 ? 2 : 0)}
                rx={2}
                fill={color}
              >
                <title>
                  {shortDate(p.date)}: {format(p.value)}
                </title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className="chart__x" aria-hidden>
        <span>{points[0] ? shortDate(points[0].date) : ""}</span>
        <span>{points.length ? shortDate(points[points.length - 1].date) : ""}</span>
      </div>
    </figure>
  );
}

export function BarList({
  rows,
  empty = "Nothing yet",
  color = "var(--leaf-500)",
  format = (n) => String(n),
}: {
  rows: { key: string; label: string; value: number; hint?: string }[];
  empty?: string;
  color?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="bar-list__row">
            <span className="bar-list__label">{r.label}</span>
            <span className="bar-list__value">{format(r.value)}</span>
          </div>
          <div className="bar-list__track" aria-hidden>
            <span style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          {r.hint ? <p className="bar-list__hint">{r.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Donut({
  parts,
  centerLabel,
  centerValue,
  format = (n) => String(n),
}: {
  parts: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  format?: (n: number) => string;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  let offset = 25; // start at 12 o'clock
  return (
    <div className="donut">
      <div className="donut__ring">
        <svg viewBox="0 0 42 42" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(", ")}>
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e8eee9" strokeWidth="5" />
          {parts.map((p) => {
            const share = (p.value / total) * 100;
            const el = (
              <circle
                key={p.label}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke={p.color}
                strokeWidth="5"
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={offset}
              >
                <title>
                  {p.label}: {format(p.value)}
                </title>
              </circle>
            );
            offset -= share;
            return el;
          })}
        </svg>
        <div className="donut__center">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="donut__legend">
        {parts.map((p) => (
          <li key={p.label}>
            <i style={{ background: p.color }} />
            <span className="flex-1">{p.label}</span>
            <strong>{format(p.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
