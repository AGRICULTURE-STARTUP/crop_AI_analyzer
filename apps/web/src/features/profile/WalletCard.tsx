"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { Card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { fetchFarmerOverview } from "@/features/farmer/api";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKsh } from "@/lib/format";
import type { Wallet } from "@/lib/types";

const AMOUNTS = ["50", "100", "200", "500"];
const POLL_MS = 4000;
const GIVE_UP_MS = 90_000;

type Phase =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "waiting"; baseline: number; started: number }
  | { kind: "late"; baseline: number };

/** Balance, free scans and M-Pesa top-up. After the prompt is sent the balance is checked until the payment lands. */
export function WalletCard({ phone }: { phone?: string | null }) {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => apiRequest<Wallet>("/api/v1/wallet/") });
  const overview = useQuery({ queryKey: ["farmer-overview"], queryFn: fetchFarmerOverview });
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState("");

  const balance = Number(wallet.data?.balance ?? user?.wallet?.balance ?? 0);
  const scans = wallet.data?.scan_count ?? user?.wallet?.scan_count ?? 0;
  const chats = wallet.data?.chat_count ?? user?.wallet?.chat_count ?? 0;

  // The polling timer reads the latest helpers through a ref so it is not restarted on every render.
  const latest = useRef({ refetch: wallet.refetch, refreshMe, toast, qc });
  useEffect(() => {
    latest.current = { refetch: wallet.refetch, refreshMe, toast, qc };
  });

  async function check(baseline: number, quiet = false) {
    const { refetch, refreshMe: reload, toast: say, qc: client } = latest.current;
    const res = await refetch();
    const now = Number(res.data?.balance ?? baseline);
    if (now > baseline) {
      say.success(`${formatKsh(now - baseline)} added. Your balance is ${formatKsh(now)}.`);
      setPhase({ kind: "idle" });
      void reload();
      client.invalidateQueries({ queryKey: ["farmer-overview"] });
      return true;
    }
    if (!quiet) say.info("No payment yet. Enter your M-Pesa PIN on your phone, then check again.");
    return false;
  }

  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const { baseline, started } = phase;
    let live = true;
    const timer = window.setInterval(async () => {
      const done = await check(baseline, true);
      if (live && !done && Date.now() - started > GIVE_UP_MS) setPhase({ kind: "late", baseline });
    }, POLL_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
    // check() only reads refs and setPhase, so the timer restarts only when the phase changes
  }, [phase]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const number = String(fd.get("phone_number") || "").trim();
    if (number.replace(/\D/g, "").length < 9) {
      setError("Enter the M-Pesa number, like 0712 345 678.");
      return;
    }
    if (!(Number(amount) >= 1)) {
      setError("Enter how much to add.");
      return;
    }
    setPhase({ kind: "sending" });
    try {
      await apiRequest("/api/v1/mpesa/topup/", { method: "POST", body: { phone_number: number, amount } });
      setPhase({ kind: "waiting", baseline: balance, started: Date.now() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The top-up could not start. Try again.");
      setPhase({ kind: "idle" });
    }
  }

  const free = overview.data?.wallet;
  const waiting = phase.kind === "waiting" || phase.kind === "late";

  return (
    <Card
      title="Wallet"
      className="wallet-card"
      action={<span className="badge badge--plain">M-Pesa</span>}
    >
      <div id="wallet" className="wallet-balance">
        <p className="wallet-balance__label">Available balance</p>
        <p className="wallet-balance__value">{formatKsh(balance) ?? "KSh 0"}</p>
        <p className="wallet-balance__meta">
          {scans} {scans === 1 ? "scan" : "scans"} · {chats} AgriBot {chats === 1 ? "chat" : "chats"}
        </p>
      </div>
      {free ? (
        <p className="wallet-note">
          {free.free_scans_left > 0
            ? `${free.free_scans_left} free ${free.free_scans_left === 1 ? "scan" : "scans"} left, then ${formatKsh(free.scan_fee)} per scan.`
            : `Each scan costs ${formatKsh(free.scan_fee)} from your wallet.`}
        </p>
      ) : null}

      {waiting ? (
        <div className="wallet-wait" role="status">
          {phase.kind === "waiting" ? <span className="wallet-wait__spin" aria-hidden /> : null}
          <div className="min-w-0 flex-1">
            <p className="wallet-wait__title">
              {phase.kind === "waiting" ? "Check your phone" : "Still no confirmation"}
            </p>
            <p className="wallet-wait__text">
              {phase.kind === "waiting"
                ? `Enter your M-Pesa PIN to pay ${formatKsh(amount)}. Your balance updates here by itself.`
                : "If you entered your PIN, M-Pesa can take a minute. Check the balance again, or start a new top-up."}
            </p>
            <div className="wallet-wait__actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => check(phase.baseline)}>
                I have paid, check now
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhase({ kind: "idle" })}>
                {phase.kind === "waiting" ? "Cancel" : "New top-up"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="wallet-form">
          <FormField
            label="M-Pesa phone"
            name="phone_number"
            type="tel"
            inputMode="tel"
            placeholder="0712 345 678"
            required
            defaultValue={phone || ""}
            autoComplete="tel"
          />
          <div className="form-field">
            <span className="font-medium text-ink/80">Amount (KSh)</span>
            <div className="amount-chips" role="group" aria-label="Quick amounts">
              {AMOUNTS.map((a) => (
                <button key={a} type="button" className={amount === a ? "is-active" : ""} aria-pressed={amount === a} onClick={() => setAmount(a)}>
                  {a}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="topup-amount">
              Amount in KSh
            </label>
            <input
              id="topup-amount"
              className="field"
              name="amount"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" disabled={phase.kind === "sending"} type="submit">
            {phase.kind === "sending" ? "Sending the request…" : `Top up ${formatKsh(amount) ?? ""} with M-Pesa`}
          </button>
          <p className="wallet-note wallet-note--center">You get an M-Pesa prompt on this phone. Enter your PIN to pay.</p>
        </form>
      )}
    </Card>
  );
}
