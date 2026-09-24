/**
 * Capability contract for the Agent OS.
 *
 * Executors are existing registered tools. This module does not invoke them
 * and does not add a second execution system.
 *
 * CRM_CREATE_NOTE is not naturally idempotent: the Note table has no
 * idempotency key. The orchestration layer therefore:
 * - runs a business-goal mutation at most once per approval
 * - does not auto-retry that mutation
 * - skips the executor when the step already recorded a note id
 * A second browser tab that approves before the first write is stored can
 * still double-write. Do not add blind retries.
 */

import type { ToolId, ToolInputSchema } from "../types";

export type CapabilityMode = "READ" | "WRITE";
export type CapabilityAvailabilityStatus = "LIVE" | "BLOCKED" | "SIMULATED" | "FUTURE";

export interface CapabilityContract {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly domain: "crm" | "communication" | "finance";
  readonly toolId: ToolId;
  /** Action understood by the existing tool handler. */
  readonly action: string;
  readonly mutating: boolean;
  readonly mode: CapabilityMode;
  readonly approvalRequired: boolean;
  readonly approval: { readonly required: boolean };
  /** Describes the permission the existing session path enforces. */
  readonly permission: "crm.read" | "crm.write" | "email.send" | "finance.blocked";
  readonly security: { readonly tenantScoped: boolean };
  readonly execution: { readonly idempotencyRequired: boolean };
  readonly verifies: boolean;
  readonly verification: {
    readonly required: boolean;
    readonly evidenceType: string;
  };
  readonly availability: { readonly status: CapabilityAvailabilityStatus };
  readonly inputSchema: ToolInputSchema;
}

export interface CapabilityUnavailableFailure {
  readonly code: "capabilityUnavailable";
  readonly capabilityId: string;
  readonly availability: CapabilityAvailabilityStatus | "UNKNOWN";
  readonly reason: string;
  readonly retryable: false;
}

const objectSchema = (
  properties: ToolInputSchema["properties"],
  required: readonly string[] = ["step", "goal"],
): ToolInputSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: true,
});

const sharedProperties = {
  step: { type: "string", description: "Step title being executed." },
  goal: { type: "string", description: "Business goal statement." },
  customerId: { type: "string", description: "CRM customer UUID." },
} as const;

function defineCapability(
  input: Omit<
    CapabilityContract,
    | "mode"
    | "approval"
    | "security"
    | "execution"
    | "verification"
    | "availability"
  > & {
    readonly availability: CapabilityAvailabilityStatus;
    readonly evidenceType: string;
  },
): CapabilityContract {
  const mode: CapabilityMode = input.mutating ? "WRITE" : "READ";
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    domain: input.domain,
    toolId: input.toolId,
    action: input.action,
    mutating: input.mutating,
    mode,
    approvalRequired: input.approvalRequired,
    approval: { required: input.approvalRequired },
    permission: input.permission,
    security: { tenantScoped: true },
    execution: { idempotencyRequired: input.mutating },
    verifies: input.verifies,
    verification: {
      required: input.mutating || input.verifies,
      evidenceType: input.evidenceType,
    },
    availability: { status: input.availability },
    inputSchema: input.inputSchema,
  };
}

export const CAPABILITIES: readonly CapabilityContract[] = [
  defineCapability({
    id: "CRM_LOAD_CUSTOMER",
    name: "Load customer",
    description: "Read the CRM customer this goal applies to. Does not write.",
    domain: "crm",
    toolId: "crm",
    action: "load_customer_context",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: false,
    availability: "LIVE",
    evidenceType: "crm_customer_read",
    inputSchema: objectSchema(sharedProperties),
  }),
  defineCapability({
    id: "CRM_PREPARE_NOTE",
    name: "Prepare CRM note",
    description: "Draft the follow-up note. Does not write.",
    domain: "crm",
    toolId: "crm",
    action: "prepare_crm_note",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: false,
    availability: "LIVE",
    evidenceType: "crm_note_draft",
    inputSchema: objectSchema(sharedProperties),
  }),
  defineCapability({
    id: "CRM_CREATE_NOTE",
    name: "Create CRM note",
    description: "Add a follow-up note through the existing CRM note path.",
    domain: "crm",
    toolId: "crm",
    action: "create_note",
    mutating: true,
    approvalRequired: true,
    permission: "crm.write",
    verifies: false,
    availability: "LIVE",
    evidenceType: "persisted_note_and_readback",
    inputSchema: objectSchema({
      ...sharedProperties,
      title: { type: "string", description: "Note title." },
      body: { type: "string", description: "Note body." },
      idempotencyKey: {
        type: "string",
        description: "Step key. The executor must not retry when this step already has a note.",
      },
    }),
  }),
  defineCapability({
    id: "CRM_VERIFY_NOTE",
    name: "Verify CRM note",
    description: "Read the note back and confirm it was stored.",
    domain: "crm",
    toolId: "crm",
    action: "verify_crm_note",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: true,
    availability: "LIVE",
    evidenceType: "crm_note_readback",
    inputSchema: objectSchema(
      {
        ...sharedProperties,
        noteId: { type: "string", description: "Note id returned by create." },
      },
      ["step", "goal", "customerId", "noteId"],
    ),
  }),
  defineCapability({
    id: "COMMUNICATION_LOAD_CUSTOMER",
    name: "Load customer for email",
    description: "Read the customer and contact email. Does not send.",
    domain: "communication",
    toolId: "email",
    action: "load_customer_context",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: false,
    availability: "LIVE",
    evidenceType: "customer_email_read",
    inputSchema: objectSchema(sharedProperties),
  }),
  defineCapability({
    id: "COMMUNICATION_PREPARE_EMAIL",
    name: "Prepare customer email",
    description: "Draft recipient, subject, and body. Does not send.",
    domain: "communication",
    toolId: "email",
    action: "prepare_customer_email",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: false,
    availability: "LIVE",
    evidenceType: "email_draft",
    inputSchema: objectSchema(sharedProperties),
  }),
  defineCapability({
    id: "COMMUNICATION_SEND_EMAIL",
    name: "Send customer email",
    description: "Send the approved draft through the server email path.",
    domain: "communication",
    toolId: "email",
    action: "send_customer_email",
    mutating: true,
    approvalRequired: true,
    permission: "email.send",
    verifies: false,
    availability: "LIVE",
    evidenceType: "provider_acceptance_queued_receipt_recipient_match",
    inputSchema: objectSchema({
      ...sharedProperties,
      to: { type: "string", description: "Recipient copied from the customer record." },
      subject: { type: "string", description: "Email subject." },
      body: { type: "string", description: "Email body." },
      idempotencyKey: { type: "string", description: "Prevents a second send of this step." },
    }),
  }),
  defineCapability({
    id: "COMMUNICATION_VERIFY_EMAIL",
    name: "Verify email acceptance",
    description: "Confirm the provider accepted the message. Does not claim inbox delivery.",
    domain: "communication",
    toolId: "email",
    action: "verify_customer_email",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: true,
    availability: "LIVE",
    evidenceType: "queued_receipt_not_inbox_delivery",
    inputSchema: objectSchema(sharedProperties),
  }),
  defineCapability({
    id: "FINANCE_CREATE_INVOICE",
    name: "Create invoice",
    description: "Finance billing stays on the authenticated finance API. The agent cannot bill.",
    domain: "finance",
    toolId: "finance",
    action: "create_invoice_from_eligible_delivery_notes",
    mutating: true,
    approvalRequired: true,
    permission: "finance.blocked",
    verifies: false,
    availability: "BLOCKED",
    evidenceType: "not_available",
    inputSchema: objectSchema(sharedProperties, ["step", "goal"]),
  }),
];

for (const capability of CAPABILITIES) {
  if (capability.mode === "WRITE" && !capability.approval.required) {
    throw new Error(`Capability ${capability.id} cannot mutate without approval`);
  }
  if (capability.mode === "READ" && capability.approval.required) {
    throw new Error(`Capability ${capability.id} must not require write approval`);
  }
  if (capability.availability.status === "LIVE" && capability.mutating) {
    if (!capability.execution.idempotencyRequired || !capability.verification.required) {
      throw new Error(`Capability ${capability.id} is missing idempotency or verification`);
    }
  }
  if (capability.mutating !== (capability.mode === "WRITE")) {
    throw new Error(`Capability ${capability.id} mode does not match mutation`);
  }
}

const byId = new Map(CAPABILITIES.map((capability) => [capability.id, capability]));

/** Tools that are not live production capabilities. They must not complete business work. */
const NON_LIVE_TOOLS: Readonly<Record<string, CapabilityAvailabilityStatus>> = {
  projects: "SIMULATED",
  documents: "SIMULATED",
  workflow: "SIMULATED",
  integration: "SIMULATED",
  calendar: "SIMULATED",
  search: "SIMULATED",
  notification: "SIMULATED",
  api: "SIMULATED",
  mcp: "SIMULATED",
  finance: "BLOCKED",
  website: "FUTURE",
  website_publish: "FUTURE",
  social: "FUTURE",
  social_publish: "FUTURE",
  social_schedule: "FUTURE",
  campaign_plan: "FUTURE",
  campaign_readiness: "FUTURE",
  growth_insights: "FUTURE",
  campaign_execute: "FUTURE",
  creative: "FUTURE",
  creative_generate: "FUTURE",
  creative_publish: "FUTURE",
};

export function getCapability(id: string): CapabilityContract | undefined {
  return byId.get(id);
}

export function listCapabilities(): readonly CapabilityContract[] {
  return CAPABILITIES;
}

export function toolAvailability(toolId: string): CapabilityAvailabilityStatus | "LIVE" {
  return NON_LIVE_TOOLS[toolId] ?? "LIVE";
}

export function capabilityUnavailable(input: {
  readonly capabilityId: string;
  readonly availability: CapabilityAvailabilityStatus | "UNKNOWN";
  readonly reason: string;
}): CapabilityUnavailableFailure {
  return {
    code: "capabilityUnavailable",
    capabilityId: input.capabilityId,
    availability: input.availability,
    reason: input.reason,
    retryable: false,
  };
}

export function formatCapabilityFailure(failure: CapabilityUnavailableFailure): string {
  return `${failure.code}: ${failure.capabilityId} ${failure.availability} ${failure.reason}`;
}

/**
 * Registry gate used before a business-goal step runs.
 * Session organizationId is the only tenant authority.
 */
export function authorizeCapabilityExecution(input: {
  readonly capabilityId?: string;
  readonly organizationId?: string;
}):
  | { readonly ok: true; readonly capability: CapabilityContract }
  | { readonly ok: false; readonly failure: CapabilityUnavailableFailure } {
  const capabilityId = input.capabilityId?.trim() ?? "";
  if (!capabilityId || !byId.has(capabilityId)) {
    return {
      ok: false,
      failure: capabilityUnavailable({
        capabilityId: capabilityId || "unknown",
        availability: "UNKNOWN",
        reason: "The capability is not in the registry.",
      }),
    };
  }
  const capability = byId.get(capabilityId)!;
  if (capability.availability.status !== "LIVE") {
    return {
      ok: false,
      failure: capabilityUnavailable({
        capabilityId,
        availability: capability.availability.status,
        reason: "The capability is not available for production execution.",
      }),
    };
  }
  if (capability.security.tenantScoped && !input.organizationId?.trim()) {
    return {
      ok: false,
      failure: capabilityUnavailable({
        capabilityId,
        availability: "LIVE",
        reason: "Tenant context is required.",
      }),
    };
  }
  if (capability.mode === "WRITE" && !capability.approval.required) {
    return {
      ok: false,
      failure: capabilityUnavailable({
        capabilityId,
        availability: "LIVE",
        reason: "Write capabilities require approval.",
      }),
    };
  }
  if (capability.execution.idempotencyRequired && !capability.mutating) {
    return {
      ok: false,
      failure: capabilityUnavailable({
        capabilityId,
        availability: "LIVE",
        reason: "Idempotency is declared on a non-mutating capability.",
      }),
    };
  }
  return { ok: true, capability };
}

export function simulatedExecutionFailure(toolId: string): CapabilityUnavailableFailure {
  return capabilityUnavailable({
    capabilityId: toolId,
    availability: toolAvailability(toolId) === "LIVE" ? "SIMULATED" : toolAvailability(toolId),
    reason: "Simulated execution cannot complete production work.",
  });
}
