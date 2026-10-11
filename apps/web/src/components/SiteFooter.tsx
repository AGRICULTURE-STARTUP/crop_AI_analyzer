import Link from "next/link";

const COLUMN_HEADING =
  "mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-sprout";
const LINK = "text-sm text-white/75 transition hover:text-white";

const EXPLORE = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/about", label: "About us" },
];

const TOOLS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/crop-advisor", label: "Crop advisor" },
  { href: "/crops", label: "Crop library" },
  { href: "/#ussd-demo", label: "Phone (USSD) demo" },
];

const JOIN = [
  { href: "/signup?role=farmer", label: "Farmers" },
  { href: "/signup?role=buyer", label: "Buyers" },
  { href: "/signup?role=agency", label: "Input shops" },
  { href: "/signup?role=lender", label: "Lenders" },
  { href: "/privacy", label: "Privacy policy" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="sm:col-span-3 md:col-span-1">
          <p className="wordmark wordmark--light text-[1.7rem]">
            Agri<span>Scan</span>
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
            Crop advice from a photo, help in English and Kiswahili, market
            links, and Farm Health Scores — on the app, on the web, and by
            dialling USSD.
          </p>
        </div>
        <div>
          <h4 className={COLUMN_HEADING}>Explore</h4>
          <ul className="space-y-2.5">
            {EXPLORE.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={COLUMN_HEADING}>Tools</h4>
          <ul className="space-y-2.5">
            {TOOLS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={COLUMN_HEADING}>Join</h4>
          <ul className="space-y-2.5">
            {JOIN.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-white/15 pt-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} AgriScan. Growing healthier farms.
      </p>
    </footer>
  );
}
