"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { fetchLenders, lenderAction } from "@/features/admin/api";
import { PageHeader, FilterTabs } from "@/components/ui/Page";
import { ApiError } from "@/lib/api";
import { formatDate, initialsOf, statusTone } from "@/lib/format";
import type { LendingPartner } from "@/lib/types";

type StatusFilter = "" | LendingPartner["verification_status"];

export default function AdminLendersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("");
  const [error, setError] = useState("");
  const list = useQuery({ queryKey: ["admin-lenders"], queryFn: fetchLenders });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "suspend" }) => lenderAction(id, action),
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["admin-lenders"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Action failed"),
  });

  const partners = list.data ?? [];
  const count = (s: StatusFilter) => (s ? partners.filter((p) => p.verification_status === s).length : partners.length);
  const rows = status ? partners.filter((p) => p.verification_status === status) : partners;

  function onAction(p: LendingPartner, action: "approve" | "suspend") {
    const message =
      action === "approve"
        ? `Approve ${p.organization_name}? They can create API keys and look up Farm Health Scores of farmers who consented.`
        : `Suspend ${p.organization_name}? Their API keys stop working immediately.`;
    if (window.confirm(message)) act.mutate({ id: p.id, action });
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

      <div className="table-wrap">
        <table className="data-table min-w-[56rem]">
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
                  <td>
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
                  <td className="font-mono text-xs">{p.registration_number || "—"}</td>
                  <td className="whitespace-nowrap">{p.contact_phone || "—"}</td>
                  <td>{p.county || "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td>
                    <span className={`badge ${statusTone(p.verification_status)}`}>{p.verification_status}</span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {p.verification_status !== "approved" ? (
                        <button
                          type="button"
                          className="btn btn-primary !py-1.5 text-xs"
                          disabled={act.isPending}
                          onClick={() => onAction(p, "approve")}
                        >
                          Approve
                        </button>
                      ) : null}
                      {p.verification_status !== "suspended" ? (
                        <button
                          type="button"
                          className="btn btn-ghost !py-1.5 text-xs"
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
