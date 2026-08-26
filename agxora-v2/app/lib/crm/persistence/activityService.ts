/**
 * Application service — authz + activity repository (read-only public API).
 * Phase 50 — Activities reuse customer.* CRM permissions.
 */

import "server-only";

import type { Actor } from "../../tenancy/types";
import { assertCan } from "../../tenancy/authorize";
import { PersistenceError } from "../../tenancy/errors";
import type { CrmActivityRecord } from "../directory/types";
import { getCustomerInWorkspace } from "./customerRepository";
import {
  getActivityInWorkspace,
  listActivitiesForCustomerInWorkspace,
} from "./activityRepository";
import { assertCrmServerProductionReady } from "./assertProductionReady";

/**
 * Resolve parent customer in the actor workspace or fail closed.
 * Never trusts client-supplied organizationId.
 */
async function requireCustomerInActorWorkspace(
  actor: Actor,
  customerId: string,
): Promise<{ readonly organizationId: string; readonly workspaceId: string }> {
  const customer = await getCustomerInWorkspace(actor.workspaceId, customerId);
  if (!customer) {
    throw new PersistenceError("not_found", "Customer not found");
  }
  if (customer.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  return {
    organizationId: customer.organizationId,
    workspaceId: actor.workspaceId,
  };
}

export async function listActivitiesForActor(
  actor: Actor,
  customerId: string,
): Promise<readonly CrmActivityRecord[]> {
  assertCrmServerProductionReady();
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.read", parent);
  return listActivitiesForCustomerInWorkspace(actor.workspaceId, customerId);
}

export async function getActivityForActor(
  actor: Actor,
  activityId: string,
): Promise<CrmActivityRecord> {
  assertCrmServerProductionReady();
  assertCan(actor, "customer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const row = await getActivityInWorkspace(actor.workspaceId, activityId);
  if (!row) {
    throw new PersistenceError("not_found", "Activity not found");
  }
  if (row.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  return row;
}
