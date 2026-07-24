"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignupForm, type SignupRole } from "@/components/SignupForm";

function SignupWithQuery() {
  const params = useSearchParams();
  const raw = params.get("role") || "farmer";
  const initialRole = (
    ["farmer", "buyer", "agency", "lender"].includes(raw) ? raw : "farmer"
  ) as SignupRole;

  return <SignupForm initialRole={initialRole} />;
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-paper px-4 pb-16 pt-28">
          <div className="panel mx-auto mt-8 max-w-lg rounded-3xl p-8">Loading…</div>
        </div>
      }
    >
      <SignupWithQuery />
    </Suspense>
  );
}
