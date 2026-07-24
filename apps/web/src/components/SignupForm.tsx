"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FormField } from "@/components/FormField";
import { SiteHeader } from "@/components/SiteHeader";
import { apiRequest, ApiError, roleHome } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { TokenPair } from "@/lib/types";

type Role = "farmer" | "buyer" | "agency" | "lender";

const META: Record<
  Role,
  { title: string; endpoint: string; blurb: string }
> = {
  farmer: {
    title: "Farmer signup",
    endpoint: "/api/v1/auth/register/farmer/",
    blurb: "Scan crops, chat with AgriBot, and manage your Farm Health Score.",
  },
  buyer: {
    title: "Buyer signup",
    endpoint: "/api/v1/auth/register/buyer/",
    blurb: "Browse farmer listings and build market connections.",
  },
  agency: {
    title: "Input agency signup",
    endpoint: "/api/v1/auth/register/agency/",
    blurb: "Publish fertiliser, seed, and crop-protection products.",
  },
  lender: {
    title: "Lending partner signup",
    endpoint: "/api/v1/auth/register/lender/",
    blurb: "Banks, MFIs, and SACCOs — manage Farm Health Score API keys.",
  },
};

export function SignupForm({ role }: { role: Role }) {
  const meta = META[role];
  const { acceptTokens } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => {
      body[k] = String(v);
    });

    try {
      const res = await apiRequest<TokenPair & { role?: string }>(meta.endpoint, {
        method: "POST",
        auth: false,
        body,
      });
      const home = await acceptTokens({
        access: res.access,
        refresh: res.refresh,
      });
      router.push(home || roleHome(role));
    } catch (err) {
      if (err instanceof ApiError) {
        const b = err.body as Record<string, unknown> | string;
        if (typeof b === "object" && b) {
          const first = Object.values(b)[0];
          setError(
            Array.isArray(first)
              ? String(first[0])
              : typeof first === "string"
                ? first
                : err.message
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Registration failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen px-4 pb-16 pt-28">
      <SiteHeader solid />
      <form
        onSubmit={onSubmit}
        className="panel mx-auto mt-8 max-w-lg animate-rise space-y-4 rounded-3xl p-6 sm:p-8"
      >
        <div>
          <h1 className="brand-mark text-3xl text-leaf-deep">{meta.title}</h1>
          <p className="mt-1 text-sm text-ink/60">{meta.blurb}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Username" name="username" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="First name" name="first_name" required />
          <FormField label="Last name" name="last_name" required />
          <FormField label="Password" name="password" type="password" required />
          <FormField
            label="Confirm password"
            name="password_confirm"
            type="password"
            required
          />
        </div>

        {role === "farmer" || role === "buyer" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" name="phone_number" required />
            <FormField label="County" name="county" required />
            <FormField label="Country" name="country" required defaultValue="Kenya" />
            {role === "farmer" ? (
              <FormField
                label="Crops / products"
                name="products"
                as="textarea"
                placeholder="Maize, tomato, beans"
              />
            ) : null}
          </div>
        ) : null}

        {role === "agency" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Agency name" name="agency_name" required />
            <FormField
              label="Agency type"
              name="agency_type"
              as="select"
              options={[
                { value: "agrovet", label: "Agrovet" },
                { value: "seed", label: "Seed" },
                { value: "fertiliser", label: "Fertiliser" },
                { value: "pesticide", label: "Pesticide" },
                { value: "other", label: "Other" },
              ]}
            />
            <FormField label="Phone" name="phone" required />
            <FormField label="County" name="county" required />
          </div>
        ) : null}

        {role === "lender" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Organization name"
              name="organization_name"
              required
            />
            <FormField
              label="Organization type"
              name="organization_type"
              as="select"
              options={[
                { value: "bank", label: "Bank" },
                { value: "mfi", label: "MFI" },
                { value: "sacco", label: "SACCO" },
                { value: "fintech", label: "Fintech" },
                { value: "other", label: "Other" },
              ]}
            />
            <FormField
              label="Registration number"
              name="registration_number"
              required
            />
            <FormField label="Contact phone" name="contact_phone" required />
            <FormField label="County" name="county" required />
            <FormField label="Website" name="website" type="url" />
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-sm text-ink/70">
          <input type="checkbox" name="privacy_accept" required className="mt-1" />
          <span>
            I accept the{" "}
            <Link href="/privacy" className="text-leaf underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <button className="btn btn-primary w-full" disabled={busy} type="submit">
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-sm text-ink/60">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-leaf">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
