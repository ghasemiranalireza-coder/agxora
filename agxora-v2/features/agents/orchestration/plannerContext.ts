/**
 * Read-only planner context for the Day 9 business-goal path.
 * This module does not create notes, send email, or call the legacy AgentRun API.
 */

import { getCrmBridgeProvider } from "../crm/adapter";
import { agentsStore } from "../store";
import { isBusinessMemoryValue, type BusinessGoalMemoryValue } from "../memory/businessContext";
import { authoritativeBusinessMemory } from "../memory/businessMemory";
import { workerRoleContext } from "../workforce/workers";
import type { WorkforceWorker } from "../types";
import { resolveFirstCustomerCrmCustomerId } from "@/app/lib/workspace/firstCustomerAgentCrm";

export type PlannerContextProvenance =
  | "CRM"
  | "BUSINESS_MEMORY"
  | "GOAL"
  | "SYSTEM"
  | "WORKER"
  | "UNAVAILABLE";

export interface PlannerContextFact {
  readonly provenance: PlannerContextProvenance;
  readonly key: string;
  readonly text: string;
}

export interface BusinessGoalPlannerContext {
  readonly resolvedAt: string;
  readonly organizationId: string;
  readonly customerId?: string;
  readonly available: boolean;
  readonly facts: readonly PlannerContextFact[];
  readonly memoryIds: readonly string[];
}

const TENANT_KEYS = new Set([
  "organizationId",
  "workspaceId",
  "tenantId",
  "actorId",
  "userId",
]);

export function rejectClientTenantKeys(
  input: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!TENANT_KEYS.has(key)) safe[key] = value;
  }
  return safe;
}

function isVerifiedMemory(value: unknown): value is BusinessGoalMemoryValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as BusinessGoalMemoryValue;
  return record.kind === "business_goal_outcome" && record.verified === true;
}

function memoryFact(value: BusinessGoalMemoryValue): PlannerContextFact {
  if (value.noteId) {
    return {
      provenance: "BUSINESS_MEMORY",
      key: "previous_crm",
      text: "Previous verified CRM goal: note created and verified.",
    };
  }
  if (value.delivery === "queued") {
    return {
      provenance: "BUSINESS_MEMORY",
      key: "previous_email",
      text: "Previous verified customer email was accepted by the provider and queued. Inbox delivery was not verified.",
    };
  }
  return {
    provenance: "BUSINESS_MEMORY",
    key: "previous_goal",
    text: "Previous verified business goal completed. No further outcome detail is stored.",
  };
}

export function plannerContextText(
  context: BusinessGoalPlannerContext | undefined,
): string {
  if (!context) return "";
  return context.facts.map((fact) => fact.text).join("\n");
}

/**
 * Assemble the minimum facts the deterministic planner may see.
 * `organizationId` is the server/session organization. `clientOrganizationId` is ignored.
 */
export async function resolveBusinessGoalPlannerContext(input: {
  readonly organizationId: string;
  readonly statement: string;
  readonly customerId?: string;
  readonly clientOrganizationId?: string;
  readonly worker?: WorkforceWorker;
}): Promise<BusinessGoalPlannerContext> {
  void input.clientOrganizationId;
  const resolvedAt = new Date().toISOString();
  const facts: PlannerContextFact[] = [
    {
      provenance: "SYSTEM",
      key: "organization",
      text: "Organization context comes from the authenticated organization.",
    },
    {
      provenance: "GOAL",
      key: "statement",
      text: input.statement.trim(),
    },
  ];

  const provider = getCrmBridgeProvider();
  let customerId: string | undefined;
  let available = false;
  if (!provider.available) {
    facts.push({
      provenance: "UNAVAILABLE",
      key: "customer",
      text: "Customer context: unavailable.",
    });
  } else {
    const listed = await provider.listCustomers(input.organizationId);
    const resolved = resolveFirstCustomerCrmCustomerId({
      requestedId: input.customerId,
      goal: input.statement,
      customerIds: listed.map((customer) => customer.id),
    });
    const customer = resolved.ok
      ? await provider.getCustomer(resolved.id)
      : null;
    if (!customer || customer.organizationId !== input.organizationId) {
      facts.push({
        provenance: "UNAVAILABLE",
        key: "customer",
        text: "Customer context: unavailable.",
      });
    } else {
      available = true;
      customerId = customer.id;
      const company = customer.companyName.trim();
      facts.push({
        provenance: "CRM",
        key: "customer_name",
        text: company
          ? `Customer: ${company}.`
          : "Customer record was found. Company name is not stored.",
      });
      const notes = await provider.listNotes(customer.id);
      const owned = notes.filter(
        (note) =>
          note.organizationId === input.organizationId &&
          note.customerId === customer.id,
      );
      facts.push({
        provenance: "CRM",
        key: "note_count",
        text: `CRM notes on file: ${owned.length}.`,
      });
    }
  }

  const memories = agentsStore.getSnapshot().memories.filter((record) => {
    if (record.organizationId !== input.organizationId) return false;
    if (record.scope !== "business") return false;
    if (!isVerifiedMemory(record.value)) return false;
    if (!customerId) return false;
    return record.value.customerId === customerId;
  });
  if (memories.length === 0) {
    facts.push({
      provenance: "UNAVAILABLE",
      key: "previous_outcome",
      text: "Previous verified outcome: unavailable.",
    });
  } else {
    const latest = memories[0]!;
    if (isVerifiedMemory(latest.value)) {
      facts.push(memoryFact(latest.value));
    }
  }

  if (input.worker && input.worker.organizationId === input.organizationId) {
    const role = workerRoleContext(input.worker.role);
    facts.push({
      provenance: "WORKER",
      key: "worker",
      text: `Worker: ${input.worker.name}. Role: ${role.title}. Status: ${input.worker.status}.`,
    });
    facts.push({
      provenance: "WORKER",
      key: "worker_constraints",
      text: role.constraints,
    });
  }

  const authoritative = authoritativeBusinessMemory({
    organizationId: input.organizationId,
    customerId,
  });
  for (const record of authoritative) {
    if (!isBusinessMemoryValue(record.value)) continue;
    facts.push({
      provenance: "BUSINESS_MEMORY",
      key: `memory:${record.id}`,
      text: `${record.value.status} ${record.value.memoryType} (${record.value.provenance}): ${record.value.content}`,
    });
  }

  return {
    resolvedAt,
    organizationId: input.organizationId,
    customerId,
    available,
    facts,
    memoryIds: [...memories.map((record) => record.id), ...authoritative.map((record) => record.id)],
  };
}
