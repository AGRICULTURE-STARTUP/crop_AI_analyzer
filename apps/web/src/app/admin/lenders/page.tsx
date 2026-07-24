"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest, ApiError } from "@/lib/api";
import type { LendingPartner } from "@/lib/types";

export default function AdminLendersPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-lenders"],
    queryFn: () =>
      apiRequest<LendingPartner[] | { results: LendingPartner[] }>(
        "/api/v1/admin/lenders/"
      ),
  });

  const partners: LendingPartner[] = Array.isArray(list.data)
    ? list.data
    : list.data?.results || [];

  async function act(id: number, action: "approve" | "suspend") {
    try {
      await apiRequest(`/api/v1/admin/lenders/${id}/${action}/`, {
        method: "POST",
      });
      qc.invalidateQueries({ queryKey: ["admin-lenders"] });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  return (
    <PortalShell role="admin" title="Lenders">
      <div className="space-y-4">
        <h1 className="brand-mark text-3xl text-leaf-deep">Lending partners</h1>
        {partners.map((p) => (
          <article
            key={p.id}
            className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
          >
            <div>
              <h2 className="font-semibold">{p.organization_name}</h2>
              <p className="text-sm text-ink/55">
                {p.organization_type} · {p.verification_status}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary !py-1.5 text-sm"
                type="button"
                onClick={() => act(p.id, "approve")}
              >
                Approve
              </button>
              <button
                className="btn btn-secondary !py-1.5 text-sm"
                type="button"
                onClick={() => act(p.id, "suspend")}
              >
                Suspend
              </button>
            </div>
          </article>
        ))}
      </div>
    </PortalShell>
  );
}
