import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RoleBoundary } from "@/components/RoleBoundary";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LenderLayout({ children }: { children: ReactNode }) {
  return <RoleBoundary role="lender">{children}</RoleBoundary>;
}
