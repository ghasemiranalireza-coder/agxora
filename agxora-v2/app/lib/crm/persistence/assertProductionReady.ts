/**
 * Phase 57.1 — CRM server persistence production gate.
 */

import "server-only";

import { requireFirstCustomerProductionReady } from "@/app/lib/production/requireReady";

export function assertCrmServerProductionReady(): void {
  requireFirstCustomerProductionReady();
}
