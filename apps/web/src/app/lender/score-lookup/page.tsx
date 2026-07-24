"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest, ApiError } from "@/lib/api";

export default function LenderScoreLookupPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    const phone = new FormData(e.currentTarget).get("phone");
    try {
      const data = await apiRequest<Record<string, unknown>>(
        `/api/v1/lender/score/?phone=${encodeURIComponent(String(phone))}`
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lookup failed");
    }
  }

  return (
    <PortalShell role="lender" title="Score lookup">
      <form onSubmit={onSubmit} className="panel max-w-xl space-y-4 rounded-3xl p-6">
        <h1 className="brand-mark text-3xl text-leaf-deep">Test score lookup</h1>
        <p className="text-sm text-ink/60">
          Same rules as the machine API — farmer must have opted in.
        </p>
        <FormField label="Phone" name="phone" placeholder="2547…" required />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <button className="btn btn-primary" type="submit">
          Look up
        </button>
        {result ? (
          <pre className="overflow-auto rounded-2xl bg-white/80 p-4 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </form>
    </PortalShell>
  );
}
