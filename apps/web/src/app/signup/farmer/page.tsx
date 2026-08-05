import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Farmer signup",
  description:
    "Create a free AgriScan farmer account. Scan crops for disease, get Kiswahili or English advice, and build your Farm Health Score.",
  alternates: { canonical: "/signup/farmer" },
};

export default function FarmerSignupPage() {
  return <SignupForm initialRole="farmer" />;
}
