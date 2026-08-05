import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Lending partner signup",
  description:
    "Partner with AgriScan to review Farm Health Scores for farmers who opt in to share them.",
  alternates: { canonical: "/signup/lender" },
};

export default function LenderSignupPage() {
  return <SignupForm initialRole="lender" />;
}
