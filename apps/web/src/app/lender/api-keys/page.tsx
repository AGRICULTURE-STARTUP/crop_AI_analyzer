"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest, ApiError } from "@/lib/api";
import type { LendingAPIKeyMeta } from "@/lib/types";

export default function LenderApiKeysPage() {
  const qc = useQueryClient();
  const [rawKey, setRawKey] = useState("");
  const [error, setError] = useState("");

  const keys = useQuery({
    queryKey: ["lender-keys"],
    queryFn: () =>
      apiRequest<LendingAPIKeyMeta[] | { results: LendingAPIKeyMeta[] }>(
        "/api/v1/lender/api-keys/"
      ),
  });

  const list: LendingAPIKeyMeta[] = Array.isArray(keys.data)
    ? keys.data
    : keys.data?.results || [];

  async function createKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setRawKey("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await apiRequest<LendingAPIKeyMeta & { api_key?: string }>(
        "/api/v1/lender/api-keys/",
        {
          method: "POST",
          body: { name: fd.get("name") || "Production" },
        }
      );
      setRawKey(res.api_key || "");
      qc.invalidateQueries({ queryKey: ["lender-keys"] });
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create key");
    }
  }

  async function rotate(id: number) {
    try {
      const res = await apiRequest<{ api_key?: string }>(
        `/api/v1/lender/api-keys/${id}/rotate/`,
        { method: "POST" }
      );
      setRawKey(res.api_key || "");
      qc.invalidateQueries({ queryKey: ["lender-keys"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rotate failed");
    }
  }

  async function revoke(id: number) {
    try {
      await apiRequest(`/api/v1/lender/api-keys/${id}/revoke/`, {
        method: "POST",
      });
      qc.invalidateQueries({ queryKey: ["lender-keys"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Revoke failed");
    }
  }

  return (
    <PortalShell role="lender" title="API keys">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={createKey} className="panel space-y-4 rounded-3xl p-6">
          <h1 className="brand-mark text-3xl text-leaf-deep">API keys</h1>
          <p className="text-sm text-ink/60">
            Raw secrets are shown once. Store them in your bank middleware.
          </p>
          <FormField label="Key name" name="name" defaultValue="Production" required />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {rawKey ? (
            <div className="rounded-2xl bg-sun/20 px-4 py-3 text-sm break-all">
              <strong>Copy now:</strong> {rawKey}
            </div>
          ) : null}
          <button className="btn btn-primary" type="submit">
            Create key
          </button>
        </form>

        <div className="space-y-3">
          {list.map((k) => (
            <article key={k.id} className="panel rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{k.name}</h2>
                  <p className="text-sm text-ink/55">
                    {k.key_prefix}… · {k.is_active ? "active" : "revoked"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-secondary !py-1.5 text-sm"
                    type="button"
                    onClick={() => rotate(k.id)}
                  >
                    Rotate
                  </button>
                  <button
                    className="btn btn-secondary !py-1.5 text-sm"
                    type="button"
                    onClick={() => revoke(k.id)}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
