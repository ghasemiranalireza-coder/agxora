/**
 * Server enforcement for seats and governed executions.
 * A missing Phase 21 table (migration not applied) keeps the previous
 * production behavior. Any other database error fails the surrounding transaction.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { getCapability } from "@/features/agents/capabilities/registry";
import { isPlanCode, type BillingInterval, type PlanCode } from "./catalog";
import { canUseCapability } from "./entitlements";
import { decideGovernedExecution, governedExecutionWhere, type ExecutionSubscription } from "./executionPolicy";
import { decideSeat } from "./seatPolicy";
import { isMissingBillingSchema } from "./schemaGuard";
import { hasPaidAccess, type SubscriptionStatus } from "./subscriptionState";

type Tx = Prisma.TransactionClient;

interface SubscriptionRow {
  readonly organizationId: string;
  readonly planCode: string;
  readonly status: SubscriptionStatus;
  readonly interval: BillingInterval;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
  readonly providerEventCreatedAt: Date;
}

function executionSubscription(row: SubscriptionRow): ExecutionSubscription | null {
  if (!isPlanCode(row.planCode)) return null;
  return {
    organizationId: row.organizationId,
    planCode: row.planCode,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

let billingSchemaReadyCache: boolean | null = null;

/** Probe outside any interactive transaction. A missing table must not abort a later write. */
export async function commercialBillingSchemaReady(): Promise<boolean> {
  if (billingSchemaReadyCache === true) return true;
  try {
    await prisma.$queryRaw`SELECT 1 FROM commercial_subscriptions LIMIT 1`;
    billingSchemaReadyCache = true;
    return true;
  } catch (error) {
    if (isMissingBillingSchema(error)) return false;
    throw error;
  }
}

export async function lockCommercialSubscription(tx: Tx, organizationId: string): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM commercial_subscriptions WHERE "organizationId" = CAST(${organizationId} AS uuid) FOR UPDATE`,
  );
}

export async function assertGovernedExecutionAllowed(
  tx: Tx,
  input: {
    readonly organizationId: string;
    readonly capabilityId: string;
    readonly now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  await lockCommercialSubscription(tx, input.organizationId);
  const row = await tx.commercialSubscription.findUnique({ where: { organizationId: input.organizationId } });
  const subscription = row ? executionSubscription(row) : null;
  if (row && !subscription) {
    throw new PersistenceError("forbidden", "Commercial subscription is not usable.");
  }
  const registryStatus = getCapability(input.capabilityId)?.availability.status ?? "UNKNOWN";
  let counted = 0;
  if (subscription && hasPaidAccess(subscription, now)) {
    counted = await tx.agentGovernedExecution.count({
      where: governedExecutionWhere({
        organizationId: input.organizationId,
        periodStart: row!.currentPeriodStart,
        periodEnd: row!.currentPeriodEnd,
      }),
    });
  }
  const decision = decideGovernedExecution({
    organizationId: input.organizationId,
    subscription,
    capabilityId: input.capabilityId,
    registryStatus,
    counted,
    now,
    replaying: false,
  });
  if (!decision.allow) {
    throw new PersistenceError("forbidden", governedDenialMessage(decision.reason));
  }
}

function governedDenialMessage(reason: string): string {
  if (reason === "execution_limit") return "The governed execution limit for this billing period has been reached.";
  if (reason === "payment_required") return "Governed execution requires an active paid subscription.";
  if (reason === "plan_denied") return "This plan does not include governed execution.";
  if (reason === "capability_not_live") return "This capability is not available.";
  return "Governed execution is not allowed.";
}

export async function assertSeatAvailable(
  tx: Tx,
  input: { readonly organizationId: string; readonly userId: string; readonly now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  await lockCommercialSubscription(tx, input.organizationId);
  const row = await tx.commercialSubscription.findUnique({ where: { organizationId: input.organizationId } });
  const subscription = row ? executionSubscription(row) : null;
  const members = await tx.membership.findMany({
    where: { organizationId: input.organizationId, status: "ACTIVE" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const decision = decideSeat({
    organizationId: input.organizationId,
    subscription,
    activeUserIds: members.map((member) => member.userId),
    userId: input.userId,
    now,
  });
  if (!decision.allow) {
    throw new PersistenceError(
      "forbidden",
      decision.reason === "seat_limit"
        ? "This plan has no remaining seats."
        : "A new member requires an active paid subscription.",
    );
  }
}

export async function assertWorkforceActivationAllowed(organizationId: string, now = new Date()): Promise<void> {
  let row: SubscriptionRow | null = null;
  try {
    row = await prisma.commercialSubscription.findUnique({ where: { organizationId } });
  } catch (error) {
    if (isMissingBillingSchema(error)) return;
    throw error;
  }
  const subscription = row ? executionSubscription(row) : null;
  const access = !subscription ? "legacy" : hasPaidAccess(subscription, now) ? "paid" : "unpaid";
  const allowed = canUseCapability({
    planCode: subscription?.planCode ?? null,
    capabilityId: "CUSTOMER_COMMUNICATION_WORKFORCE",
    access,
  });
  if (!allowed) {
    throw new PersistenceError("forbidden", "This plan does not include the Customer Communication Workforce.");
  }
}

export async function countSeats(organizationId: string): Promise<number> {
  const members = await prisma.membership.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { userId: true },
    distinct: ["userId"],
  });
  return members.length;
}

export async function countGovernedExecutions(input: {
  readonly organizationId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}): Promise<number> {
  return prisma.agentGovernedExecution.count({ where: governedExecutionWhere(input) });
}

export function planCodeOf(row: { readonly planCode: string } | null): PlanCode | null {
  return row && isPlanCode(row.planCode) ? row.planCode : null;
}
