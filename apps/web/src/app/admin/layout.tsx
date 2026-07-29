import type { ReactNode } from "react";
import { RoleBoundary } from "@/components/RoleBoundary";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleBoundary role="admin">{children}</RoleBoundary>;
}
