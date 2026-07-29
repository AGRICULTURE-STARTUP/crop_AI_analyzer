import type { ReactNode } from "react";
import { RoleBoundary } from "@/components/RoleBoundary";

export default function LenderLayout({ children }: { children: ReactNode }) {
  return <RoleBoundary role="lender">{children}</RoleBoundary>;
}
