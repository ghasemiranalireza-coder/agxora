/**
 * Phase 51–53 — CRM status conversion, disposition, and reactivation.
 *
 * Deterministic allowed transitions only. Live CRM status is the mutation
 * authority — never stale Lead Queue / GrowthCrmLink outcome.
 * Persistence remains v7 (no new Agent OS collections).
 * No won/closed-won/deal/revenue semantics.
 */

import {
  draftFromCustomer,
  type CrmCustomerRecord,
  type CrmCustomerStatus,
} from "@/app/lib/crm/directory";
import { getCrmBridgeProvider } from "./adapter";
import { getGrowthCrmLink, listGrowthCrmLinks } from "./sync";
import type { GrowthCrmLink } from "./types";

/** Phase 51 conversion ladder — single next step only. */
export const CRM_CONVERSION_NEXT: Readonly<
  Partial<Record<CrmCustomerStatus, CrmCustomerStatus>>
> = {
  lead: "prospect",
  prospect: "active",
};

/**
 * Phase 52 disposition targets.
 * `active` has two exits and always requires an explicit target.
 */
export const CRM_DISPOSITION_TARGETS: Readonly<
  Record<CrmCustomerStatus, readonly CrmCustomerStatus[]>
> = {
  lead: ["inactive"],
  prospect: ["inactive"],
  active: ["vip", "inactive"],
  inactive: ["archived"],
  vip: [],
  archived: [],
};

/**
 * Phase 53 reactivation targets.
 * `vip` has two exits and always requires an explicit target.
 * `archived` may only return to `inactive` (no skip to active/vip).
 * `inactive` reactivation is only to `active` (archive remains DISPOSE).
 */
export const CRM_REACTIVATION_TARGETS: Readonly<
  Record<CrmCustomerStatus, readonly CrmCustomerStatus[]>
> = {
  lead: [],
  prospect: [],
  active: [],
  inactive: ["active"],
  vip: ["active", "inactive"],
  archived: ["inactive"],
};

/** Full allowed transition map (conversion ∪ disposition ∪ reactivation). */
export const CRM_STATUS_TRANSITIONS: Readonly<
  Record<CrmCustomerStatus, readonly CrmCustomerStatus[]>
> = {
  lead: ["prospect", "inactive"],
  prospect: ["active", "inactive"],
  active: ["vip", "inactive"],
  inactive: ["archived", "active"],
  vip: ["active", "inactive"],
  archived: ["inactive"],
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

export type StatusTargetResolution = {
  readonly ok: boolean;
  readonly target?: CrmCustomerStatus;
  readonly code?: string;
  readonly message?: string;
};

/** Conversion-only next (Phase 51 ADVANCE_CRM_STATUS). */
export function nextAllowedCrmStatus(
  current: CrmCustomerStatus,
): CrmCustomerStatus | undefined {
  return CRM_CONVERSION_NEXT[current];
}

export function dispositionTargetsFor(
  current: CrmCustomerStatus,
): readonly CrmCustomerStatus[] {
  return CRM_DISPOSITION_TARGETS[current] ?? [];
}

export function reactivationTargetsFor(
  current: CrmCustomerStatus,
): readonly CrmCustomerStatus[] {
  return CRM_REACTIVATION_TARGETS[current] ?? [];
}

export function isAllowedCrmStatusTransition(
  from: CrmCustomerStatus,
  to: CrmCustomerStatus,
): boolean {
  return (CRM_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function isConversionTransition(
  from: CrmCustomerStatus,
  to: CrmCustomerStatus,
): boolean {
  return CRM_CONVERSION_NEXT[from] === to;
}

export function isDispositionTransition(
  from: CrmCustomerStatus,
  to: CrmCustomerStatus,
): boolean {
  return dispositionTargetsFor(from).includes(to);
}

export function isReactivationTransition(
  from: CrmCustomerStatus,
  to: CrmCustomerStatus,
): boolean {
  return reactivationTargetsFor(from).includes(to);
}

/** Phase 51 ADVANCE — conversion ladder only. */
export function resolveAdvanceTarget(input: {
  readonly current: CrmCustomerStatus;
  readonly requested?: CrmCustomerStatus;
}): StatusTargetResolution {
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
  return { ok: true, target: input.requested ?? next };
}

/**
 * Phase 52 DISPOSE — disposition targets only.
 * `active` always requires an explicit target (vip | inactive).
 */
export function resolveDispositionTarget(input: {
  readonly current: CrmCustomerStatus;
  readonly requested?: CrmCustomerStatus;
}): StatusTargetResolution {
  const targets = dispositionTargetsFor(input.current);
  if (targets.length === 0) {
    return {
      ok: false,
      code: "no_transition",
      message: "crm_status_has_no_allowed_disposition",
    };
  }
  if (input.current === "active" && !input.requested) {
    return {
      ok: false,
      code: "explicit_target_required",
      message: "crm_status_active_requires_explicit_target",
    };
  }
  if (!input.requested) {
    if (targets.length === 1) {
      return { ok: true, target: targets[0] };
    }
    return {
      ok: false,
      code: "explicit_target_required",
      message: "crm_status_explicit_target_required",
    };
  }
  if (!targets.includes(input.requested)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: "crm_status_transition_not_allowed",
      target: input.requested,
    };
  }
  return { ok: true, target: input.requested };
}

/**
 * Phase 53 REACTIVATE — reactivation targets only.
 * `vip` always requires an explicit target (active | inactive).
 * `archived` may only go to `inactive`.
 * `inactive` may only go to `active` under REACTIVATE.
 */
export function resolveReactivateTarget(input: {
  readonly current: CrmCustomerStatus;
  readonly requested?: CrmCustomerStatus;
}): StatusTargetResolution {
  const targets = reactivationTargetsFor(input.current);
  if (targets.length === 0) {
    return {
      ok: false,
      code: "no_transition",
      message: "crm_status_has_no_allowed_reactivation",
    };
  }
  if (input.current === "vip" && !input.requested) {
    return {
      ok: false,
      code: "explicit_target_required",
      message: "crm_status_vip_requires_explicit_target",
    };
  }
  if (!input.requested) {
    if (targets.length === 1) {
      return { ok: true, target: targets[0] };
    }
    return {
      ok: false,
      code: "explicit_target_required",
      message: "crm_status_explicit_target_required",
    };
  }
  if (!targets.includes(input.requested)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: "crm_status_transition_not_allowed",
      target: input.requested,
    };
  }
  return { ok: true, target: input.requested };
}

/**
 * Handler-side resolver: accept conversion, disposition, or reactivation
 * when requested is present; never auto-pick among multiple vip/active exits.
 */
export function resolveStatusMutationTarget(input: {
  readonly current: CrmCustomerStatus;
  readonly requested?: CrmCustomerStatus;
}): StatusTargetResolution {
  if (input.requested) {
    if (isConversionTransition(input.current, input.requested)) {
      return resolveAdvanceTarget(input);
    }
    if (isDispositionTransition(input.current, input.requested)) {
      return resolveDispositionTarget(input);
    }
    if (isReactivationTransition(input.current, input.requested)) {
      return resolveReactivateTarget(input);
    }
    return {
      ok: false,
      code: "invalid_transition",
      message: "crm_status_transition_not_allowed",
      target: input.requested,
    };
  }
  const conv = nextAllowedCrmStatus(input.current);
  const dispositions = dispositionTargetsFor(input.current);
  const reactivations = reactivationTargetsFor(input.current);
  if (conv && dispositions.length === 0 && reactivations.length === 0) {
    return resolveAdvanceTarget(input);
  }
  if (!conv && dispositions.length === 1 && reactivations.length === 0) {
    return resolveDispositionTarget(input);
  }
  if (!conv && dispositions.length === 0 && reactivations.length === 1) {
    return resolveReactivateTarget(input);
  }
  if (
    input.current === "active" ||
    input.current === "vip" ||
    dispositions.length > 1 ||
    reactivations.length > 1
  ) {
    return {
      ok: false,
      code: "explicit_target_required",
      message: "crm_status_explicit_target_required",
    };
  }
  if (conv) {
    return resolveAdvanceTarget(input);
  }
  if (reactivations.length === 1) {
    return resolveReactivateTarget(input);
  }
  if (dispositions.length === 1) {
    return resolveDispositionTarget(input);
  }
  return {
    ok: false,
    code: "no_transition",
    message: "crm_status_has_no_allowed_advance",
  };
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

  const resolved = resolveStatusMutationTarget({
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
