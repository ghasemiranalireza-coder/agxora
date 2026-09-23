import { describe, expect, it } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE,
  customerDeletePersistenceError,
  isFinanceReferenceDeleteConflict,
} from "./customerDeleteConflict";

describe("customer delete Finance conflict", () => {
  it("maps Prisma restrict / required-relation codes to HTTP 409", () => {
    const p2003 = { name: "PrismaClientKnownRequestError", code: "P2003" };
    const p2014 = { name: "PrismaClientKnownRequestError", code: "P2014" };
    expect(isFinanceReferenceDeleteConflict(p2003)).toBe(true);
    expect(isFinanceReferenceDeleteConflict(p2014)).toBe(true);
    expect(isFinanceReferenceDeleteConflict(new Error("Failed to delete"))).toBe(
      false,
    );

    const conflict = customerDeletePersistenceError(p2003);
    expect(conflict).toBeInstanceOf(PersistenceError);
    expect(conflict.code).toBe("conflict");
    expect(conflict.status).toBe(409);
    expect(conflict.message).toBe(CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE);
    expect(conflict.message).not.toMatch(/P2003|SQL|constraint/i);

    const unexpected = customerDeletePersistenceError(new Error("boom"));
    expect(unexpected.code).toBe("persistence");
    expect(unexpected.status).toBe(500);
    expect(unexpected.message).toBe("Failed to delete customer");
  });
});
