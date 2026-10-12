import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Input shop signup",
  description:
    "List your seed, fertiliser, and crop-protection products on Ukulima Bora so farmers nearby can find your store.",
  alternates: { canonical: "/signup/agency" },
};

export default function AgencySignupPage() {
  return <SignupForm initialRole="agency" />;
}
