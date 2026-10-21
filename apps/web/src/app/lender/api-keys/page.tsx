"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { KeyIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { Card, PageHeader } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/useConfirm";
import { apiRequest, ApiError } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import type { LendingAPIKeyMeta } from "@/lib/types";

type CreatedKey = LendingAPIKeyMeta & { api_key?: string };

export default function LenderApiKeysPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawKey, setRawKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const keys = useQuery({
    queryKey: ["lender-keys"],
    queryFn: () => apiRequest<LendingAPIKeyMeta[] | { results: LendingAPIKeyMeta[] }>("/api/v1/lender/api-keys/"),
  });
  const list: LendingAPIKeyMeta[] = Array.isArray(keys.data) ? keys.data : keys.data?.results || [];

  const onSecret = (message: string) => (res: { api_key?: string }) => {
    setRawKey(res.api_key || "");
    setCopied(false);
    setError("");
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["lender-keys"] });
  };
  const onFail = (fallback: string) => (err: unknown) =>
    setError(err instanceof ApiError ? err.message : fallback);

  const create = useMutation({
    mutationFn: (name: string) =>
      apiRequest<CreatedKey>("/api/v1/lender/api-keys/", { method: "POST", body: { name } }),
    onSuccess: onSecret("Key created. Copy the secret now."),
    onError: onFail("Could not create the key."),
  });
  const rotate = useMutation({
    mutationFn: (id: number) =>
      apiRequest<{ api_key?: string }>(`/api/v1/lender/api-keys/${id}/rotate/`, { method: "POST" }),
    onSuccess: onSecret("Key rotated. Copy the new secret now."),
    onError: onFail("Could not rotate the key."),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/v1/lender/api-keys/${id}/revoke/`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Key revoked");
      qc.invalidateQueries({ queryKey: ["lender-keys"] });
    },
    onError: onFail("Could not revoke the key."),
  });

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") || "").trim() || "Production";
    create.mutate(name, { onSuccess: () => form.reset() });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      toast.success("Secret copied");
    } catch {
      toast.error("Could not copy. Select the secret and copy it by hand.");
    }
  }

  return (
    <PortalShell role="lender" title="API keys">
      <PageHeader
        title="API keys"
        lead="Keys let your systems call the Farm Health Score API. A secret is shown only once, when you create or rotate a key."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card title="Create a key">
          <form onSubmit={onCreate} className="space-y-3">
            <label className="form-field">
              <span className="font-medium text-ink/80">Key name</span>
              <input className="field" name="name" defaultValue="Production" required maxLength={100} />
            </label>
            <button className="btn btn-primary w-full" type="submit" disabled={create.isPending}>
              <KeyIcon size={15} /> {create.isPending ? "Creating…" : "Create key"}
            </button>
          </form>
        </Card>

        <div className="space-y-3">
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {rawKey ? (
            <div className="notice notice--warn">
              <KeyIcon size={18} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold">Copy this secret now. It will not be shown again.</p>
                <code className="block break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-[var(--ink)]">
                  {rawKey}
                </code>
                <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
                  {copied ? "Copied" : "Copy secret"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="table-wrap table-wrap--stack">
            <table className="data-table data-table--stack min-w-[36rem]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.isLoading ? (
                  <tr>
                    <td colSpan={6} className="!py-8 text-center">
                      Loading keys…
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="!py-8 text-center">
                      No keys yet. Create one to start calling the API.
                    </td>
                  </tr>
                ) : (
                  list.map((k) => (
                    <tr key={k.id}>
                      <td className="cell-title font-medium text-[var(--ink)]">{k.name}</td>
                      <td data-label="Prefix" className="font-mono text-xs">
                        {k.key_prefix}…
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${k.is_active ? "badge-ok" : "badge-danger"}`}>
                          {k.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td data-label="Created" className="whitespace-nowrap">
                        {formatDate(k.created_at)}
                      </td>
                      <td data-label="Last used" className="whitespace-nowrap">
                        {k.last_used_at ? timeAgo(k.last_used_at) : "Never"}
                      </td>
                      <td className="cell-actions">
                        {k.is_active ? (
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              disabled={rotate.isPending}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: `Rotate “${k.name}”?`,
                                  message: "A new secret is created. The old secret stops working immediately.",
                                  confirmLabel: "Rotate key",
                                });
                                if (ok) rotate.mutate(k.id);
                              }}
                            >
                              Rotate
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              disabled={revoke.isPending}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: `Revoke “${k.name}”?`,
                                  message: "Calls made with this key are refused from now on. This cannot be undone.",
                                  confirmLabel: "Revoke key",
                                  tone: "danger",
                                });
                                if (ok) revoke.mutate(k.id);
                              }}
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
