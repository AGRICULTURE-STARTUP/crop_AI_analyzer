import { PortalShell } from "@/components/PortalShell";
import { Card, PageHeader } from "@/components/ui/Page";

export default function LenderDocsPage() {
  const base = process.env.NEXT_PUBLIC_API_URL || "https://api.ukulimabora.example.com";

  return (
    <PortalShell role="lender" title="API docs">
      <PageHeader
        title="Integrator docs"
        lead="Machine clients call the Farm Health Score endpoint with a Bearer API key issued from this portal, after admin approval."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title="Request">
          <pre className="overflow-auto rounded-lg bg-[var(--forest-deep)] p-4 font-mono text-xs leading-relaxed text-[var(--mist)]">
{`curl -s "${base}/api/v1/lending/score/?phone=2547XXXXXXXX" \\
  -H "Authorization: Bearer <YOUR_API_KEY>"`}
          </pre>
          <p className="mt-3 text-xs text-ink/70">
            Use the key’s full secret. Keep it on your servers, never in a mobile app or browser.
          </p>
        </Card>
        <Card title="Rules">
          <ul className="list-disc space-y-2 pl-5 text-sm text-ink/70">
            <li>Only farmers who opted in to lending return score data.</li>
            <li>
              Responses include name, county, health score, risk tier and total scans, plus{" "}
              <code>farm_size_acres</code> and <code>crops</code> when the farmer has set them (otherwise{" "}
              <code>null</code>).
            </li>
            <li>Unapproved or suspended partners receive HTTP 403.</li>
            <li>Rotating a key on the API keys page stops the old secret immediately.</li>
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
