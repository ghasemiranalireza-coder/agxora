/**
 * Map Prisma FK restrict failures (Finance → Customer) to a conflict,
 * without leaking SQL or inventing a delete.
 */

import { PersistenceError } from "../../tenancy/errors";

export const CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE =
  "This customer cannot currently be deleted because financial documents are associated with the customer.";

function nestedCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  if ("code" in error && error.code) return String(error.code);
  if ("cause" in error) return nestedCode(error.cause);
  return "";
}

export function isFinanceReferenceDeleteConflict(error: unknown): boolean {
  const code = nestedCode(error);
  if (code === "P2003" || code === "P2014") return true;
  const message = error instanceof Error ? error.message : "";
  return /foreign key constraint|required relation/i.test(message);
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
