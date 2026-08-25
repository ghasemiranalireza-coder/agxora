/**
 * Phase 51.0 — CRM Lead Status Advancement (Conversion Pipeline).
 *
 * Deterministic allowed transitions only. Live CRM status is the mutation
 * authority — never stale Lead Queue / GrowthCrmLink outcome.
 * Persistence remains v7 (no new Agent OS collections).
 */

import {
  draftFromCustomer,
  type CrmCustomerRecord,
  type CrmCustomerStatus,
} from "@/app/lib/crm/directory";
import { getCrmBridgeProvider } from "./adapter";
import { getGrowthCrmLink, listGrowthCrmLinks } from "./sync";
import type { GrowthCrmLink } from "./types";

/** Conservative conversion ladder — no won/closed-won/deal semantics. */
export const CRM_STATUS_TRANSITIONS: Readonly<
  Record<CrmCustomerStatus, readonly CrmCustomerStatus[]>
> = {
  lead: ["prospect"],
  prospect: ["active"],
  active: [],
  inactive: [],
  vip: [],
  archived: [],
};

export type CrmStatusAdvanceOutcome =
  | "advanced"
  | "blocked"
  | "unavailable"
  | "error"
  | "invalid_transition"
  | "missing_link"
  | "missing_customer"
  | "org_mismatch";

export interface CrmStatusAdvanceResult {
  readonly available: boolean;
  readonly success: boolean;
  readonly outcome: CrmStatusAdvanceOutcome;
  readonly message: string;
  readonly customerId?: string;
  readonly fromStatus?: CrmCustomerStatus;
  readonly toStatus?: CrmCustomerStatus;
  readonly noteId?: string;
  readonly href?: string;
  readonly duplicated: boolean;
}

export function nextAllowedCrmStatus(
  current: CrmCustomerStatus,
): CrmCustomerStatus | undefined {
  return CRM_STATUS_TRANSITIONS[current]?.[0];
}

export function isAllowedCrmStatusTransition(
  from: CrmCustomerStatus,
  to: CrmCustomerStatus,
): boolean {
  return (CRM_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function resolveAdvanceTarget(input: {
  readonly current: CrmCustomerStatus;
  readonly requested?: CrmCustomerStatus;
}): {
  readonly ok: boolean;
  readonly target?: CrmCustomerStatus;
  readonly code?: string;
  readonly message?: string;
} {
  const next = nextAllowedCrmStatus(input.current);
  if (!next) {
    return {
      ok: false,
      code: "no_transition",
      message: "crm_status_has_no_allowed_advance",
    };
  }
  if (input.requested && input.requested !== next) {
    return {
      ok: false,
      code: "invalid_transition",
      message: "crm_status_transition_not_allowed",
      target: input.requested,
    };
  }
  if (input.requested && !isAllowedCrmStatusTransition(input.current, input.requested)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: "crm_status_transition_not_allowed",
      target: input.requested,
    };
  }
  return { ok: true, target: input.requested ?? next };
}

function isUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "CrmBridgeUnavailableError" ||
      error.message.includes("_unavailable"))
  );
}

/**
 * Advance a linked CRM customer status using the live CRM record.
 * Optional status note is best-effort documentation (never claimed as email/publish).
 */
export async function advanceCrmCustomerStatus(input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly targetStatus?: CrmCustomerStatus;
  readonly taskId?: string;
  readonly attachNote?: boolean;
}): Promise<{
  readonly result: CrmStatusAdvanceResult;
  readonly customer: CrmCustomerRecord | null;
  readonly link: GrowthCrmLink | null;
}> {
  const link = getGrowthCrmLink(input.organizationId, input.profileId);
  if (!link || !link.customerId) {
    return {
      result: {
        available: true,
        success: false,
        outcome: "missing_link",
        message: "crm_link_required_before_status_advance",
        duplicated: false,
      },
      customer: null,
      link: link ?? null,
    };
  }

  const bridge = getCrmBridgeProvider();
  if (!bridge.available) {
    return {
      result: {
        available: false,
        success: false,
        outcome: "unavailable",
        message: "crm_bridge_unavailable",
        customerId: link.customerId,
        duplicated: false,
        href: link.href,
      },
      customer: null,
      link,
    };
  }

  let customer: CrmCustomerRecord | null;
  try {
    customer = await bridge.getCustomer(link.customerId);
  } catch (error) {
    if (isUnavailableError(error) || !bridge.available) {
      return {
        result: {
          available: false,
          success: false,
          outcome: "unavailable",
          message: "crm_bridge_unavailable",
          customerId: link.customerId,
          duplicated: false,
          href: link.href,
        },
        customer: null,
        link,
      };
    }
    return {
      result: {
        available: true,
        success: false,
        outcome: "error",
        message: error instanceof Error ? error.message : "crm_customer_read_failed",
        customerId: link.customerId,
        duplicated: false,
        href: link.href,
      },
      customer: null,
      link,
    };
  }

  if (!customer) {
    return {
      result: {
        available: true,
        success: false,
        outcome: "missing_customer",
        message: "crm_customer_missing",
        customerId: link.customerId,
        duplicated: false,
        href: link.href,
      },
      customer: null,
      link,
    };
  }

  if (customer.organizationId !== input.organizationId) {
    return {
      result: {
        available: true,
        success: false,
        outcome: "org_mismatch",
        message: "crm_customer_org_mismatch",
        customerId: customer.id,
        fromStatus: customer.status,
        duplicated: false,
        href: link.href,
      },
      customer,
      link,
    };
  }

  const resolved = resolveAdvanceTarget({
    current: customer.status,
    requested: input.targetStatus,
  });
  if (!resolved.ok || !resolved.target) {
    return {
      result: {
        available: true,
        success: false,
        outcome: "invalid_transition",
        message: resolved.message ?? "crm_status_transition_not_allowed",
        customerId: customer.id,
        fromStatus: customer.status,
        toStatus: input.targetStatus,
        duplicated: false,
        href: link.href,
      },
      customer,
      link,
    };
  }

  const target = resolved.target;

  try {
    const draft = {
      ...draftFromCustomer(customer),
      status: target,
    };
    const updated = await bridge.updateCustomer(
      input.organizationId,
      customer.id,
      draft,
    );

    let noteId: string | undefined;
    if (input.attachNote !== false) {
      try {
        const note = await bridge.createNote(input.organizationId, customer.id, {
          title: `Status advanced · ${customer.status} → ${target}`,
          body: [
            `CRM status advanced for ${updated.companyName}.`,
            `From: ${customer.status}`,
            `To: ${target}`,
            input.taskId ? `Agent task: ${input.taskId}` : undefined,
            "",
            "Source: AGXORA Growth Agent (internal CRM note).",
            "Note: status advance only — no outbound email or publish.",
          ]
            .filter((line): line is string => typeof line === "string")
            .join("\n"),
          author: "AGXORA Growth Agent",
        });
        noteId = note.id;
      } catch {
        // Status mutation already succeeded — note is documentation only.
      }
    }

    return {
      result: {
        available: true,
        success: true,
        outcome: "advanced",
        message: "crm_status_advanced",
        customerId: updated.id,
        fromStatus: customer.status,
        toStatus: updated.status,
        noteId,
        duplicated: false,
        href: link.href,
      },
      customer: updated,
      link,
    };
  } catch (error) {
    if (isUnavailableError(error)) {
      return {
        result: {
          available: false,
          success: false,
          outcome: "unavailable",
          message: "crm_bridge_unavailable",
          customerId: customer.id,
          fromStatus: customer.status,
          toStatus: target,
          duplicated: false,
          href: link.href,
        },
        customer,
        link,
      };
    }
    return {
      result: {
        available: true,
        success: false,
        outcome: "error",
        message: error instanceof Error ? error.message : "crm_status_update_failed",
        customerId: customer.id,
        fromStatus: customer.status,
        toStatus: target,
        duplicated: false,
        href: link.href,
      },
      customer,
      link,
    };
  }
}

/** Load live CRM statuses for linked customers (org-scoped). */
export async function loadCrmStatusesForOrganization(
  organizationId: string,
): Promise<ReadonlyMap<string, CrmCustomerStatus>> {
  const bridge = getCrmBridgeProvider();
  const map = new Map<string, CrmCustomerStatus>();
  if (!bridge.available) return map;
  const links = listGrowthCrmLinks(organizationId);
  for (const link of links) {
    if (!link.customerId) continue;
    try {
      const customer = await bridge.getCustomer(link.customerId);
      if (customer && customer.organizationId === organizationId) {
        map.set(link.customerId, customer.status);
      }
    } catch {
      // Skip unreadable customers — queue falls back without status hints.
    }
  }
  return map;
}
