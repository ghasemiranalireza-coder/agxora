/**
 * AI Workforce foundation. Workers are identities on the existing Agent OS.
 * They do not execute tools, approve actions, or widen capability contracts.
 */

import { auditLog } from "@/app/lib/backend/audit/logger";
import { authorizeCapabilityExecution, getCapability } from "../capabilities/registry";
import { agentsStore } from "../store";
import type { WorkforceWorker, WorkerRole, WorkerStatus } from "../types";

const ROLES: readonly WorkerRole[] = [
  "CUSTOMER_COMMUNICATION",
  "SALES",
  "MARKETING",
  "FINANCE",
  "OPERATIONS",
  "EXECUTIVE",
];

const COMMUNICATION_CAPABILITIES = [
  "CRM_LOAD_CUSTOMER",
  "CRM_PREPARE_NOTE",
  "CRM_CREATE_NOTE",
  "CRM_VERIFY_NOTE",
  "COMMUNICATION_LOAD_CUSTOMER",
  "COMMUNICATION_PREPARE_EMAIL",
  "COMMUNICATION_SEND_EMAIL",
  "COMMUNICATION_VERIFY_EMAIL",
] as const;

const ROLE_CONTEXT: Record<WorkerRole, { readonly title: string; readonly responsibilities: string; readonly constraints: string }> = {
  CUSTOMER_COMMUNICATION: {
    title: "Customer communication and follow-up",
    responsibilities: "Prepare customer communications, request approval, send approved communications, verify provider acceptance, and record verified outcomes.",
    constraints: "Cannot perform finance mutations, execute blocked capabilities, bypass approval, or claim inbox delivery from provider acceptance.",
  },
  SALES: {
    title: "Sales",
    responsibilities: "Role definition only. No sales execution is implemented.",
    constraints: "Cannot execute protected work.",
  },
  MARKETING: {
    title: "Marketing",
    responsibilities: "Role definition only. No marketing execution is implemented.",
    constraints: "Cannot execute protected work.",
  },
  FINANCE: {
    title: "Finance",
    responsibilities: "Role definition only. Finance mutations stay blocked.",
    constraints: "Cannot create invoices or convert a blocked finance capability to live.",
  },
  OPERATIONS: {
    title: "Operations",
    responsibilities: "Role definition only. No operations execution is implemented.",
    constraints: "Cannot execute protected work.",
  },
  EXECUTIVE: {
    title: "Executive",
    responsibilities: "Role definition only. No executive execution is implemented.",
    constraints: "Cannot execute protected work.",
  },
};

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function isWorkerRole(value: string): value is WorkerRole {
  return (ROLES as readonly string[]).includes(value);
}

export function workerRoleContext(role: WorkerRole) {
  return ROLE_CONTEXT[role];
}

/** Live capabilities for a role. Client lists are ignored. Finance stays excluded. */
export function capabilitiesForRole(role: WorkerRole): readonly string[] {
  const requested = role === "CUSTOMER_COMMUNICATION" ? COMMUNICATION_CAPABILITIES : [];
  return requested.filter((id) => {
    const capability = getCapability(id);
    return capability?.availability.status === "LIVE";
  });
}

export function capabilitySummary(worker: WorkforceWorker): readonly string[] {
  const domains = new Set<string>();
  for (const id of worker.allowedCapabilities) {
    const capability = getCapability(id);
    if (capability?.availability.status === "LIVE") domains.add(capability.domain);
  }
  return [...domains];
}

function requireTenant(organizationId: string): string {
  const organization = organizationId.trim();
  if (!organization) throw new Error("Tenant context is required.");
  return organization;
}

export function createWorker(input: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly role: WorkerRole;
  readonly name?: string;
  readonly description?: string;
  readonly status?: WorkerStatus;
}): WorkforceWorker {
  const organizationId = requireTenant(input.organizationId);
  const role = input.role;
  if (!isWorkerRole(role)) throw new Error("Unsupported worker role.");
  const status = input.status ?? (role === "CUSTOMER_COMMUNICATION" ? "ACTIVE" : "DRAFT");
  const now = nowIso();
  const context = workerRoleContext(role);
  const worker: WorkforceWorker = {
    id: createId("worker"),
    organizationId,
    key: role.toLowerCase(),
    name: input.name?.trim() || context.title,
    role,
    description: input.description?.trim() || context.responsibilities,
    status,
    allowedCapabilities: capabilitiesForRole(role),
    createdAt: now,
    updatedAt: now,
  };
  agentsStore.upsertWorker(worker);
  auditLog({
    action: "worker.created",
    resource: "workforce_worker",
    resourceId: worker.id,
    organizationId,
    actorUserId: input.actorId,
    metadata: { role, status, key: worker.key },
  });
  return worker;
}

export function updateWorker(input: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly workerId: string;
  readonly name?: string;
  readonly description?: string;
  readonly status?: WorkerStatus;
  readonly role?: WorkerRole;
}): WorkforceWorker {
  const organizationId = requireTenant(input.organizationId);
  const current = (agentsStore.getSnapshot().workers ?? []).find(
    (worker) => worker.id === input.workerId && worker.organizationId === organizationId,
  );
  if (!current) throw new Error("Worker not found.");
  const role = input.role ?? current.role;
  if (!isWorkerRole(role)) throw new Error("Unsupported worker role.");
  const status = input.status ?? current.status;
  const next: WorkforceWorker = {
    ...current,
    name: input.name?.trim() || current.name,
    description: input.description?.trim() || current.description,
    role,
    status,
    allowedCapabilities: capabilitiesForRole(role),
    updatedAt: nowIso(),
  };
  agentsStore.upsertWorker(next);
  auditLog({
    action: status !== current.status ? "worker.status_changed" : "worker.updated",
    resource: "workforce_worker",
    resourceId: next.id,
    organizationId,
    actorUserId: input.actorId,
    metadata: { role, status, previousStatus: current.status },
  });
  return next;
}

export function findWorker(organizationId: string, workerId: string): WorkforceWorker | undefined {
  const organization = organizationId.trim();
  if (!organization || !workerId.trim()) return undefined;
  return (agentsStore.getSnapshot().workers ?? []).find(
    (worker) => worker.id === workerId && worker.organizationId === organization,
  );
}

export function assertWorkerCanStart(organizationId: string, workerId: string): WorkforceWorker {
  const worker = findWorker(organizationId, workerId);
  if (!worker) throw new Error("Worker not found.");
  if (worker.status !== "ACTIVE") throw new Error("Worker is not active.");
  return worker;
}

export function assertWorkerCapability(worker: WorkforceWorker, capabilityId: string | undefined): void {
  const id = capabilityId?.trim() ?? "";
  if (!worker.allowedCapabilities.includes(id)) {
    throw new Error("Worker is not allowed to use this capability.");
  }
  const decision = authorizeCapabilityExecution({
    capabilityId: id,
    organizationId: worker.organizationId,
  });
  if (!decision.ok) {
    throw new Error("Worker capability is not authorized.");
  }
}

export function assertPlanCapabilities(worker: WorkforceWorker, capabilityIds: readonly (string | undefined)[]): void {
  for (const capabilityId of capabilityIds) {
    if (capabilityId) assertWorkerCapability(worker, capabilityId);
  }
}
