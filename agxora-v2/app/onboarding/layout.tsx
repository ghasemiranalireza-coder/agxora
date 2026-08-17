import type { ReactNode } from "react";
import { enforcePrivatePageAccess } from "@/app/lib/auth/server/enforcePrivatePageAccess";
import { OnboardingClientLayout } from "./OnboardingClientLayout";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await enforcePrivatePageAccess("/onboarding");
  return <OnboardingClientLayout>{children}</OnboardingClientLayout>;
}
