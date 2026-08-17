/**
 * PostgreSQL customer activity repository — workspace-scoped, append-only.
 * Phase 50 — CRM profile timeline (not dashboard feed, not IAM audit).
 */

import "server-only";

import { prisma } from "../../db/prisma";
import { PersistenceError } from "../../tenancy/errors";
import type { ActivityPayload } from "./activityEmitter";
import { toCrmActivityRecord } from "./mappers";
import type { CrmActivityRecord } from "../directory/types";

export type ActivityAppendInput = ActivityPayload & {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
};

export async function appendActivityRecord(
  input: ActivityAppendInput,
): Promise<CrmActivityRecord> {
  try {
    const row = await prisma.customerActivity.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        kind: input.kind,
        title: input.title,
        detail: input.detail,
        actor: input.actor,
      },
    });
    return toCrmActivityRecord(row);
  } catch (error) {
    throw new PersistenceError("persistence", "Failed to append activity", {
      details: [{ message: error instanceof Error ? error.message : "unknown" }],
    });
  }
}

export async function listActivitiesForCustomerInWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<readonly CrmActivityRecord[]> {
  const rows = await prisma.customerActivity.findMany({
    where: { workspaceId, customerId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCrmActivityRecord);
}

export async function getActivityInWorkspace(
  workspaceId: string,
  activityId: string,
): Promise<CrmActivityRecord | null> {
  const row = await prisma.customerActivity.findFirst({
    where: { id: activityId, workspaceId },
  });
  return row ? toCrmActivityRecord(row) : null;
}
