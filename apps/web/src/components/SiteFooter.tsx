import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[2fr_1fr_1.5fr]">
        <div>
          <h3 className="brand-mark text-xl text-white">
            Agri<span>Scan</span>
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
            Crop advice from a photo, help in English and Kiswahili, market
            links, and Farm Health Scores — on the app, on the web, and by
            dialling USSD.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-sprout">
            Explore
          </h4>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="/#features" className="hover:text-white">
                Features
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#how-we-help" className="hover:text-white">
                For farmers
              </Link>
            </li>
            <li>
              <Link href="/#ussd-demo" className="hover:text-white">
                Phone (USSD) demo
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-sprout">
            Join
          </h4>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="/signup?role=farmer" className="hover:text-white">
                Farmers
              </Link>
            </li>
            <li>
              <Link href="/signup?role=buyer" className="hover:text-white">
                Buyers
              </Link>
            </li>
            <li>
              <Link href="/signup?role=agency" className="hover:text-white">
                Input shops
              </Link>
            </li>
            <li>
              <Link href="/signup?role=lender" className="hover:text-white">
                Lenders
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Privacy policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-white/15 pt-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} AgriScan. Growing healthier farms.
      </p>
    </footer>
  );
}
