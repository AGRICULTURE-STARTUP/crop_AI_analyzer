import type { ReactNode } from "react";
import { RoleBoundary } from "@/components/RoleBoundary";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return <RoleBoundary role="agency">{children}</RoleBoundary>;
}
