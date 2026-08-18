import type { ReactNode } from "react";
import { enforcePrivatePageAccess } from "@/app/lib/auth/server/enforcePrivatePageAccess";
import { DashboardClientLayout } from "./DashboardClientLayout";

export const dynamic = "force-dynamic";

/**
 * Server layout — real PostgreSQL session validation before the client shell.
 * Cookie presence is not authentication.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await enforcePrivatePageAccess("/dashboard");
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
