import type { ReactNode } from "react";
import { enforcePrivatePageAccess } from "@/app/lib/auth/server/enforcePrivatePageAccess";

export const dynamic = "force-dynamic";

export default async function WelcomeLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await enforcePrivatePageAccess("/welcome");
  return children;
}
