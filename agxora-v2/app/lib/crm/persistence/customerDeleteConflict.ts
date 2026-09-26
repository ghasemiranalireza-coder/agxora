/**
 * Map Prisma FK restrict failures (Finance → Customer) to a conflict,
 * without leaking SQL or inventing a delete.
 */

import { PersistenceError } from "../../tenancy/errors";

export const CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE =
  "This customer cannot currently be deleted because financial documents are associated with the customer.";

export function isFinanceReferenceDeleteConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return code === "P2003" || code === "P2014";
}

export function customerDeletePersistenceError(error: unknown): PersistenceError {
  if (isFinanceReferenceDeleteConflict(error)) {
    return new PersistenceError(
      "conflict",
      CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE,
    );
  }
  return new PersistenceError("persistence", "Failed to delete customer");
}
