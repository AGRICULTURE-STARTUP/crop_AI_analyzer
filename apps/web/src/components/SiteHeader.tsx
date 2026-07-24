import Link from "next/link";

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={`absolute inset-x-0 top-0 z-20 ${
        solid ? "border-b border-[var(--line)] bg-paper/90" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="brand-mark text-2xl text-leaf-deep md:text-3xl">
          AgriScan
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn btn-secondary !py-2 text-sm">
            Log in
          </Link>
          <Link href="/signup/farmer" className="btn btn-primary !py-2 text-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
