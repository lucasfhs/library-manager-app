import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession, type Role } from "@/lib/session";

const loginPath: Record<Role, string> = { operator: "/loginAdmin", reader: "/loginUser" };

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session || session.role !== role) {
    return <Navigate to={loginPath[role]} replace state={{ from: location.pathname }} />;
  }
  return children;
}
