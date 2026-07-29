import type { ReactNode } from "react";
import { RoleBoundary } from "@/components/RoleBoundary";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return <RoleBoundary role="buyer">{children}</RoleBoundary>;
}
