"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { FormField } from "@/components/FormField";
import { SiteHeader } from "@/components/SiteHeader";
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
    <form onSubmit={onSubmit} className="panel space-y-4 rounded-3xl p-6 sm:p-8">
      <div>
        <h1 className="brand-mark text-3xl text-leaf-deep">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sign in with your AgriScan username and password.
        </p>
      </div>
      <FormField label="Username" name="username" required />
      <FormField label="Password" name="password" type="password" required />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-ink/60">
        New here?{" "}
        <Link href="/signup/farmer" className="font-semibold text-leaf">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen px-4 pb-16 pt-28">
      <SiteHeader solid />
      <div className="mx-auto mt-8 max-w-md animate-rise">
        <Suspense fallback={<div className="panel rounded-3xl p-8">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
