"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { roleHome } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export function RoleBoundary({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (user.role !== role) {
      router.replace(roleHome(user.role));
    }
  }, [loading, pathname, role, router, user]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="min-h-screen grid place-items-center text-leaf">
        Loading…
      </div>
    );
  }

  return children;
}
