"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FIRST_CUSTOMER_TEAM_SETTINGS_HREF } from "../../lib/workspace/firstCustomerTeamEmail";

/**
 * Legacy /dashboard/team is a localStorage demo. First-customer team
 * management is Settings → Team (Prisma control plane).
 */
export default function TeamPage(): null {
  const router = useRouter();
  useEffect(() => {
    router.replace(FIRST_CUSTOMER_TEAM_SETTINGS_HREF);
  }, [router]);
  return null;
}
