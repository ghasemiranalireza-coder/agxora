/**
 * Deterministic organization export assembled from current source-of-truth rows.
 * No export table is written.
 */

import { projectAgentOsExport } from "./projectAgentOs";
import { projectExecutionOutcome, type SafeExecutionOutcome } from "./evidenceProjection";
import { redactSecrets } from "./redact";

export const DATA_EXPORT_VERSION = 1;

export interface OrganizationExport {
  readonly exportVersion: typeof DATA_EXPORT_VERSION;
  readonly generatedAt: string;
  readonly organizationId: string;
  readonly organization: { readonly id: string; readonly name: string };
  readonly memberships: readonly Record<string, unknown>[];
  readonly customers: readonly unknown[];
  readonly contacts: readonly unknown[];
  readonly notes: readonly unknown[];
  readonly activities: readonly unknown[];
  readonly documentMetadata: readonly unknown[];
  readonly invoices: readonly unknown[];
  readonly deliveryNotes: readonly unknown[];
  readonly financeSettings: readonly unknown[];
  readonly workers: readonly Record<string, unknown>[];
  readonly goals: readonly Record<string, unknown>[];
  readonly plans: readonly Record<string, unknown>[];
  readonly approvals: readonly Record<string, unknown>[];
  readonly memories: readonly Record<string, unknown>[];
  readonly governedExecutions: readonly Record<string, unknown>[];
  readonly governedEvidence: readonly Record<string, unknown>[];
  readonly commercialSubscription: Record<string, unknown> | null;
}

function jsonSafe(value: unknown): unknown {
  return JSON.parse(JSON.stringify(redactSecrets(value))) as unknown;
}

export function assembleOrganizationExport(input: {
  readonly generatedAt: string;
  readonly organization: { readonly id: string; readonly name: string };
  readonly memberships: readonly Record<string, unknown>[];
  readonly customers: readonly unknown[];
  readonly contacts: readonly unknown[];
  readonly notes: readonly unknown[];
  readonly activities: readonly unknown[];
  readonly documentMetadata: readonly unknown[];
  readonly invoices: readonly unknown[];
  readonly deliveryNotes: readonly unknown[];
  readonly financeSettings: readonly unknown[];
  readonly agentOsPayload: unknown;
  readonly governedExecutions: readonly {
    readonly id: string;
    readonly idempotencyKey: string;
    readonly executionId: string;
    readonly status: string;
    readonly capabilityId: string;
    readonly workerId: string | null;
    readonly actorId: string;
    readonly approvalGranted: boolean;
    readonly verificationStatus: string;
    readonly outcome: unknown;
    readonly createdAt: string;
    readonly updatedAt: string;
  }[];
  readonly governedEvidence: readonly Record<string, unknown>[];
  readonly commercialSubscription?: Record<string, unknown> | null;
}): OrganizationExport {
  const agent = projectAgentOsExport(input.agentOsPayload, input.organization.id);
  const executions = input.governedExecutions.map((row) => {
    const outcome: SafeExecutionOutcome = projectExecutionOutcome(row.outcome);
    return {
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      executionId: row.executionId,
      status: row.status,
      capabilityId: row.capabilityId,
      workerId: row.workerId,
      actorId: row.actorId,
      approvalGranted: row.approvalGranted,
      verificationStatus: row.verificationStatus,
      outcome,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
  return {
    exportVersion: DATA_EXPORT_VERSION,
    generatedAt: input.generatedAt,
    organizationId: input.organization.id,
    organization: input.organization,
    memberships: input.memberships.map((row) => jsonSafe(row) as Record<string, unknown>),
    customers: input.customers.map(jsonSafe),
    contacts: input.contacts.map(jsonSafe),
    notes: input.notes.map(jsonSafe),
    activities: input.activities.map(jsonSafe),
    documentMetadata: input.documentMetadata.map(jsonSafe),
    invoices: input.invoices.map(jsonSafe),
    deliveryNotes: input.deliveryNotes.map(jsonSafe),
    financeSettings: input.financeSettings.map(jsonSafe),
    workers: agent.workers,
    goals: agent.goals,
    plans: agent.plans,
    approvals: agent.approvals,
    memories: agent.memories,
    governedExecutions: executions,
    governedEvidence: input.governedEvidence.map((row) => jsonSafe(row) as Record<string, unknown>),
    commercialSubscription: input.commercialSubscription
      ? (jsonSafe(input.commercialSubscription) as Record<string, unknown>)
      : null,
  };
}
