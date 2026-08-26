import type { ReactNode } from "react";
import { enforcePrivatePageAccess } from "@/app/lib/auth/server/enforcePrivatePageAccess";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await enforcePrivatePageAccess("/workspace");
  return children;
}
