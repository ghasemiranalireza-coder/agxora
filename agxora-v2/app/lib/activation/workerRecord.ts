/**
 * Server-built Customer Communication Worker.
 * Capabilities come from the live registry, never from a request body.
 */

import { randomUUID } from "crypto";
import { getCapability } from "@/features/agents/capabilities/registry";
import type { WorkforceWorker } from "@/features/agents/types";

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

export function activationCommunicationCapabilities(): readonly string[] {
  return COMMUNICATION_CAPABILITIES.filter((id) => {
    const capability = getCapability(id);
    return capability?.availability.status === "LIVE" && capability.id !== "FINANCE_CREATE_INVOICE";
  });
}

export function buildActivationCommunicationWorker(
  organizationId: string,
  now = new Date().toISOString(),
): WorkforceWorker {
  const tenant = organizationId.trim();
  if (!tenant) throw new Error("Tenant context is required.");
  return {
    id: `worker_${randomUUID()}`,
    organizationId: tenant,
    key: "customer_communication",
    name: "Customer Communication Worker",
    role: "CUSTOMER_COMMUNICATION",
    description:
      "Prepare customer communications, request approval, and record verified CRM follow-ups.",
    status: "ACTIVE",
    allowedCapabilities: activationCommunicationCapabilities(),
    createdAt: now,
    updatedAt: now,
  };
}
