/**
 * Finance agent capability foundation.
 * The tool never bills on its own — billing stays on the authenticated API.
 */

import type { ToolInvocationContext, ToolInvocationResult } from "../types";

export const FINANCE_BILL_CAPABILITY = "create_invoice_from_eligible_delivery_notes" as const;
export const FINANCE_BILL_ENDPOINT = "/api/v1/finance/invoices/bill";

function readString(
  params: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Core Agent finance tool contract.
 * External/customer-facing billing remains approval-controlled and must use
 * POST /api/v1/finance/invoices/bill (same transactional, idempotent path).
 */
export async function handleFinanceTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "action") ?? FINANCE_BILL_CAPABILITY;

  if (
    ctx.params.organizationId &&
    typeof ctx.params.organizationId === "string" &&
    ctx.params.organizationId !== ctx.organizationId
  ) {
    return {
      ok: false,
      error: "Tenant mismatch",
      durationMs: Date.now() - started,
    };
  }

  return {
    ok: true,
    approvalRequired: true,
    output: {
      capability: FINANCE_BILL_CAPABILITY,
      action,
      blocked: true,
      billed: false,
      reason:
        "Finance billing is approval-controlled and must use the authenticated finance API.",
      endpoint: FINANCE_BILL_ENDPOINT,
    },
    durationMs: Date.now() - started,
  };
}
