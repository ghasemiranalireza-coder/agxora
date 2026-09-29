/**
 * Server-built Marketing Worker.
 * Capabilities come from the live registry, never from a request body.
 */

import { randomUUID } from "node:crypto";
import { getCapability } from "@/features/agents/capabilities/registry";
import type { WorkforceWorker } from "@/features/agents/types";

const MARKETING_CAPABILITIES = [
  "MARKETING_LOAD_BUSINESS_CONTEXT",
  "MARKETING_PREPARE_PLAN",
  "MARKETING_RECORD_PLAN",
  "MARKETING_VERIFY_PLAN",
  "MARKETING_CREATE_IMAGE",
  "MARKETING_RECORD_BUSINESS_FACT",
] as const;

export function activationMarketingCapabilities(): readonly string[] {
  return MARKETING_CAPABILITIES.filter((id) => getCapability(id)?.availability.status === "LIVE");
}

export function buildActivationMarketingWorker(
  organizationId: string,
  now = new Date().toISOString(),
): WorkforceWorker {
  const tenant = organizationId.trim();
  if (!tenant) throw new Error("Tenant context is required.");
  return {
    id: `worker_${randomUUID()}`,
    organizationId: tenant,
    key: "marketing",
    name: "Marketing Worker",
    role: "MARKETING",
    description: "Prepare a seven-day marketing plan, request approval, and store the approved plan.",
    status: "ACTIVE",
    allowedCapabilities: activationMarketingCapabilities(),
    createdAt: now,
    updatedAt: now,
  };
}
