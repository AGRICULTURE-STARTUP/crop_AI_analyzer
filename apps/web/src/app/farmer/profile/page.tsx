"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Wallet } from "@/lib/types";

export default function FarmerProfilePage() {
  const { user, refreshMe } = useAuth();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => apiRequest<Wallet>("/api/v1/wallet/"),
  });

  async function topup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await apiRequest("/api/v1/mpesa/topup/", {
        method: "POST",
        body: {
          phone_number: fd.get("phone_number"),
          amount: fd.get("amount"),
        },
      });
      setMsg("STK push initiated. Complete on your phone.");
      walletQuery.refetch();
      refreshMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  const profile = (user?.profile || {}) as Record<string, string>;

  return (
    <PortalShell role="farmer" title="Profile & wallet">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel rounded-3xl p-6">
          <h1 className="brand-mark text-3xl text-leaf-deep">Your farm</h1>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/55">Name</dt>
              <dd>
                {user?.user.first_name} {user?.user.last_name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/55">Phone</dt>
              <dd>{profile.phone_number || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/55">County</dt>
              <dd>{profile.county || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/55">Crops</dt>
              <dd className="text-right">{profile.products || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-leaf-deep">Wallet</h2>
          <p className="mt-2 text-3xl font-semibold">
            KSh {walletQuery.data?.balance ?? user?.wallet?.balance ?? "0.00"}
          </p>
          <p className="text-sm text-ink/55">
            Scans: {walletQuery.data?.scan_count ?? 0} · Chats:{" "}
            {walletQuery.data?.chat_count ?? 0}
          </p>
          <form onSubmit={topup} className="mt-5 space-y-3">
            <FormField
              label="M-Pesa phone"
              name="phone_number"
              placeholder="2547…"
              required
              defaultValue={profile.phone_number || ""}
            />
            <FormField
              label="Amount (KSh)"
              name="amount"
              type="number"
              required
              defaultValue="100"
            />
            {msg ? <p className="text-sm text-[var(--ok)]">{msg}</p> : null}
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Sending…" : "Top up with M-Pesa"}
            </button>
          </form>
        </section>
      </div>
    </PortalShell>
  );
}
