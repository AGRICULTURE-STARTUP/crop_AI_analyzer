"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { FormField } from "@/components/FormField";
import { apiRequest, ApiError, roleHome } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { TokenPair } from "@/lib/types";

export type SignupRole = "farmer" | "agency" | "lender";

const ROLES: {
  value: SignupRole;
  label: string;
  blurb: string;
  endpoint: string;
}[] = [
  {
    value: "farmer",
    label: "Farmer",
    blurb: "Scan crops, chat with AgriBot, check market prices, and manage your Farm Health Score.",
    endpoint: "/api/v1/auth/register/farmer/",
  },
  {
    value: "agency",
    label: "Input agency",
    blurb: "Publish fertiliser, seed, and crop-protection products.",
    endpoint: "/api/v1/auth/register/agency/",
  },
  {
    value: "lender",
    label: "Lending partner",
    blurb: "Banks, MFIs, and SACCOs — review Farm Health Scores with farmer consent.",
    endpoint: "/api/v1/auth/register/lender/",
  },
];

function isSignupRole(value: string): value is SignupRole {
  return ROLES.some((r) => r.value === value);
}

export function SignupForm({
  initialRole = "farmer",
}: {
  initialRole?: SignupRole;
}) {
  const [role, setRole] = useState<SignupRole>(
    isSignupRole(initialRole) ? initialRole : "farmer"
  );
  const meta = ROLES.find((r) => r.value === role)!;
  const { acceptTokens } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("password_confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const body: Record<string, string> = {};
      fd.forEach((v, k) => {
        if (k === "password_confirm" || k === "privacy_accept" || k === "role") {
          return;
        }
        body[k] = String(v);
      });
      const res = await apiRequest<TokenPair & { role?: string }>(meta.endpoint, {
        method: "POST",
        auth: false,
        body,
      });

      const session = await acceptTokens({
        access: res.access,
        refresh: res.refresh,
      });
      setSuccess("Signup successful, redirecting you…");
      await new Promise((r) => setTimeout(r, 1200));
      router.push(session.home || roleHome(role));
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
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Join Ukulima Bora"
      title="One platform. Three roles."
      subtitle="Pick how you take part — farmer, input shop, or lender — and we open the right portal for you."
    >
      <form onSubmit={onSubmit} className="auth-panel space-y-4">
        <div>
          <h2 className="brand-mark text-3xl text-leaf-deep">Create account</h2>
          <p className="mt-1 text-sm text-ink/70">{meta.blurb}</p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-ink/80">I am signing up as</span>
          <select
            className="field"
            name="role"
            value={role}
            required
            onChange={(e) => {
              const next = e.target.value;
              if (isSignupRole(next)) {
                setRole(next);
                setError("");
              }
            }}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          {role === "farmer" ? (
            <>
              <FormField
                label="Username"
                name="username"
                required
                autoComplete="username"
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
              <FormField label="First name" name="first_name" required />
              <FormField label="Last name" name="last_name" required />
            </>
          ) : (
            <div className="sm:col-span-2">
              <FormField
                label="Work email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
          )}
          <FormField
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
          />
          <FormField
            label="Confirm password"
            name="password_confirm"
            type="password"
            required
            autoComplete="new-password"
          />
        </div>

        <div key={role} className="grid gap-4 sm:grid-cols-2">
          {role === "farmer" ? (
            <>
              <FormField label="Phone" name="phone_number" required />
              <FormField label="County" name="county" required />
              <FormField
                label="Country"
                name="country"
                required
                defaultValue="Kenya"
              />
              <FormField
                label="Crops / products"
                name="products"
                as="textarea"
                placeholder="Maize, tomato, beans"
              />
            </>
          ) : null}

          {role === "agency" ? (
            <>
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
            </>
          ) : null}

          {role === "lender" ? (
            <>
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
            </>
          ) : null}
        </div>

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
        {success ? <p className="text-sm text-[var(--ok)]">{success}</p> : null}
        <button className="btn btn-primary w-full" disabled={busy} type="submit">
          {busy
            ? success
              ? "Redirecting…"
              : "Creating account…"
            : `Create ${meta.label.toLowerCase()} account`}
        </button>
        <p className="text-center text-sm text-ink/70">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-leaf">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
