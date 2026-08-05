import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Buyer signup",
  description:
    "Join AgriScan as a buyer. Find farmers with healthy harvests and connect for produce near you.",
  alternates: { canonical: "/signup/buyer" },
};

export default function BuyerSignupPage() {
  return <SignupForm initialRole="buyer" />;
}
