/**
 * Phase 57.1 — server-only production gate enforcement.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  collectFirstCustomerModeSnapshot,
  evaluateFirstCustomerProductionGate,
  type FirstCustomerGateResult,
} from "./firstCustomerGate";

/**
 * Fail closed when the first-customer production gate is enforced but not ready.
 * Used by server-backed Agent OS / CRM persistence paths.
 */
export function requireFirstCustomerProductionReady(): FirstCustomerGateResult {
  const result = evaluateFirstCustomerProductionGate(
    collectFirstCustomerModeSnapshot(),
  );
  if (result.enforced && !result.ready) {
    throw new PersistenceError(
      "misconfigured",
      "First-customer production gate is not ready",
      {
        status: 503,
        details: result.issues.map((issue) => ({ message: issue.message })),
      },
    );
  }
  return result;
}
