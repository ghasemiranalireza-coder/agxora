/**
 * Auth mode selection — Phase 43 + RC fail-closed defaults.
 *
 * server = production-grade path (bcrypt + httpOnly sessions)
 * local  = offline/dev LocalAuthAdapter only (NOT production identity)
 *
 * Never infer local mode from CRM persistence.
 * Production always uses server auth.
 */

import { isProductionRuntime } from "@/app/lib/production/env";

export type AgxoraAuthMode = "server" | "local";

export function getAuthMode(): AgxoraAuthMode {
  if (isProductionRuntime()) return "server";

  const explicit = (
    process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE || ""
  )
    .trim()
    .toLowerCase();
  if (explicit === "local") return "local";
  return "server";
}

export function isServerAuthMode(): boolean {
  return getAuthMode() === "server";
}
