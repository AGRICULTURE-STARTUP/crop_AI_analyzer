import type { ReactNode } from "react";
import { RoleBoundary } from "@/components/RoleBoundary";

export default function FarmerLayout({ children }: { children: ReactNode }) {
  return <RoleBoundary role="farmer">{children}</RoleBoundary>;
}
