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

export interface CapabilityContract {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly toolId: ToolId;
  /** Action understood by the existing tool handler. */
  readonly action: string;
  readonly mutating: boolean;
  readonly approvalRequired: boolean;
  /** Describes the permission the existing CRM/session path enforces. */
  readonly permission: "crm.read" | "crm.write";
  readonly verifies: boolean;
  readonly inputSchema: ToolInputSchema;
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

export const CAPABILITIES: readonly CapabilityContract[] = [
  {
    id: "CRM_LOAD_CUSTOMER",
    name: "Load customer",
    description: "Read the CRM customer this goal applies to. Does not write.",
    toolId: "crm",
    action: "load_customer_context",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: false,
    inputSchema: objectSchema(sharedProperties),
  },
  {
    id: "CRM_PREPARE_NOTE",
    name: "Prepare CRM note",
    description: "Draft the follow-up note. Does not write.",
    toolId: "crm",
    action: "prepare_crm_note",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: false,
    inputSchema: objectSchema(sharedProperties),
  },
  {
    id: "CRM_CREATE_NOTE",
    name: "Create CRM note",
    description: "Add a follow-up note through the existing CRM note path.",
    toolId: "crm",
    action: "create_note",
    mutating: true,
    approvalRequired: true,
    permission: "crm.write",
    verifies: false,
    inputSchema: objectSchema({
      ...sharedProperties,
      title: { type: "string", description: "Note title." },
      body: { type: "string", description: "Note body." },
      idempotencyKey: {
        type: "string",
        description: "Step key. The executor must not retry when this step already has a note.",
      },
    }),
  },
  {
    id: "CRM_VERIFY_NOTE",
    name: "Verify CRM note",
    description: "Read the note back and confirm it was stored.",
    toolId: "crm",
    action: "verify_crm_note",
    mutating: false,
    approvalRequired: false,
    permission: "crm.read",
    verifies: true,
    inputSchema: objectSchema(
      {
        ...sharedProperties,
        noteId: { type: "string", description: "Note id returned by create." },
      },
      ["step", "goal", "customerId", "noteId"],
    ),
  },
];

for (const capability of CAPABILITIES) {
  if (capability.mutating && !capability.approvalRequired) {
    throw new Error(
      `Capability ${capability.id} cannot mutate without approval`,
    );
  }
}

const byId = new Map(CAPABILITIES.map((capability) => [capability.id, capability]));

export function getCapability(id: string): CapabilityContract | undefined {
  return byId.get(id);
}

export function listCapabilities(): readonly CapabilityContract[] {
  return CAPABILITIES;
}
