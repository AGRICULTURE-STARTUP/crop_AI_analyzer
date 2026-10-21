"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/useConfirm";
import { fetchLenders, lenderAction } from "@/features/admin/api";
import { PageHeader, FilterTabs } from "@/components/ui/Page";
import { ApiError } from "@/lib/api";
import { formatDate, initialsOf, statusTone } from "@/lib/format";
import type { LendingPartner } from "@/lib/types";

type StatusFilter = "" | LendingPartner["verification_status"];

export default function AdminLendersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<StatusFilter>("");
  const [error, setError] = useState("");
  const list = useQuery({ queryKey: ["admin-lenders"], queryFn: fetchLenders });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "suspend"; name: string }) => lenderAction(id, action),
    onSuccess: (_data, { action, name }) => {
      setError("");
      toast.success(action === "approve" ? `${name} approved` : `${name} suspended`);
      qc.invalidateQueries({ queryKey: ["admin-lenders"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Action failed"),
  });

  const partners = list.data ?? [];
  const count = (s: StatusFilter) => (s ? partners.filter((p) => p.verification_status === s).length : partners.length);
  const rows = status ? partners.filter((p) => p.verification_status === status) : partners;

  async function onAction(p: LendingPartner, action: "approve" | "suspend") {
    const approve = action === "approve";
    const ok = await confirm({
      title: approve ? `Approve ${p.organization_name}?` : `Suspend ${p.organization_name}?`,
      message: approve
        ? "They can create API keys and look up Farm Health Scores of farmers who consented."
        : "Their API keys stop working immediately.",
      confirmLabel: approve ? "Approve" : "Suspend",
      tone: approve ? "primary" : "danger",
    });
    if (ok) act.mutate({ id: p.id, action, name: p.organization_name });
  }

  return (
    <PortalShell role="admin" title="Lenders">
      <PageHeader
        title="Lending partners"
        lead="Banks, SACCOs and MFIs that read Farm Health Scores. Approve only organisations you have verified."
      />

      <div className="toolbar">
        <FilterTabs
          label="Verification status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All", count: count("") },
            { value: "pending", label: "Pending", count: count("pending") },
            { value: "approved", label: "Approved", count: count("approved") },
            { value: "suspended", label: "Suspended", count: count("suspended") },
          ]}
        />
      </div>

      {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="table-wrap table-wrap--stack">
        <table className="data-table data-table--stack min-w-[56rem]">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Registration no.</th>
              <th>Contact</th>
              <th>County</th>
              <th>Applied</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={7} className="!py-10 text-center">
                  Loading partners…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="!py-10 text-center">
                  No lending partners in this list.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id}>
                  <td className="cell-title">
                    <div className="flex items-center gap-3">
                      <span className="avatar avatar--light">{initialsOf(p.organization_name)}</span>
                      <span className="min-w-0">
                        <span className="block max-w-[15rem] truncate font-semibold text-[var(--ink)]">
                          {p.organization_name}
                        </span>
                        <span className="block text-xs uppercase">{p.organization_type}</span>
                      </span>
                    </div>
                  </td>
                  <td data-label="Registration no." className="font-mono text-xs">
                    {p.registration_number || "—"}
                  </td>
                  <td data-label="Contact" className="whitespace-nowrap">
                    {p.contact_phone || "—"}
                  </td>
                  <td data-label="County">{p.county || "—"}</td>
                  <td data-label="Applied" className="whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${statusTone(p.verification_status)}`}>{p.verification_status}</span>
                  </td>
                  <td className="cell-actions">
                    <div className="flex justify-end gap-2">
                      {p.verification_status !== "approved" ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={act.isPending}
                          onClick={() => onAction(p, "approve")}
                        >
                          Approve
                        </button>
                      ) : null}
                      {p.verification_status !== "suspended" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={act.isPending}
                          onClick={() => onAction(p, "suspend")}
                        >
                          Suspend
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
