import { PortalShell } from "@/components/PortalShell";

export default function LenderDocsPage() {
  const base =
    process.env.NEXT_PUBLIC_API_URL || "https://api.agriscan.example.com";

  return (
    <PortalShell role="lender" title="API docs">
      <article className="panel max-w-3xl space-y-4 rounded-3xl p-6 sm:p-8">
        <h1 className="brand-mark text-3xl text-leaf-deep">Integrator docs</h1>
        <p className="text-sm text-ink/65">
          Machine clients call the Farm Health Score endpoint with a Bearer API
          key issued from this portal (after admin approval).
        </p>
        <pre className="overflow-auto rounded-2xl bg-ink p-4 text-xs text-mist">
{`curl -s "${base}/api/v1/lending/score/?phone=2547XXXXXXXX" \\
  -H "Authorization: Bearer <YOUR_API_KEY>"`}
        </pre>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink/70">
          <li>Only farmers with lending opt-in return score data.</li>
          <li>Unapproved or suspended partners receive HTTP 403.</li>
          <li>Rotate keys from the API keys page; old secrets stop working.</li>
        </ul>
      </article>
    </PortalShell>
  );
}
