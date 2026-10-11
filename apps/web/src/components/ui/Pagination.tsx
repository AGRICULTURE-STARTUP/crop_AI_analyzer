import { ArrowRightIcon } from "@/components/Icons";

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Pages">
      <button
        type="button"
        className="pagination__step"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ArrowRightIcon size={15} className="rotate-180" /> Previous
      </button>
      <ul>
        {pageList(page, pages).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="pagination__gap" aria-hidden>
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={`pagination__page ${p === page ? "is-active" : ""}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ul>
      <button
        type="button"
        className="pagination__step"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next <ArrowRightIcon size={15} />
      </button>
    </nav>
  );
}
