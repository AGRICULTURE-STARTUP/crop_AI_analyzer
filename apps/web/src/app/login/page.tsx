"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { FormField } from "@/components/FormField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const home = await login(
        String(fd.get("username") || ""),
        String(fd.get("password") || "")
      );
      const next = params.get("next");
      router.push(next || home);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "Login failed"
          : "Unable to log in"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="auth-panel space-y-4">
      <div>
        <h2 className="brand-mark text-3xl text-leaf-deep">Welcome back</h2>
        <p className="mt-1 text-sm text-ink/60">
          Sign in with your email (or username) and password. We send you to the
          portal for your role.
        </p>
      </div>
      <FormField
        label="Email or username"
        name="username"
        required
        autoComplete="username"
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-ink/60">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-leaf">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure access"
      title="Your farm tools, ready when you are"
      subtitle="Log in to scan crops, chat with AgriBot, check markets, or review Farm Health Scores — depending on your role."
    >
      <Suspense
        fallback={<div className="auth-panel rounded-3xl p-8">Loading…</div>}
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
