/**
 * Application service — authz + validation + repository.
 */

import "server-only";

import type { Actor } from "../../tenancy/types";
import { assertCan } from "../../tenancy/authorize";
import { PersistenceError } from "../../tenancy/errors";
import type { CrmCustomerDraft, CrmCustomerRecord } from "../directory/types";
import { validateCustomerDraft } from "../directory/validation";
import {
  createCustomerRecord,
  deleteCustomerRecord,
  getCustomerInWorkspace,
  listCustomersForWorkspace,
  updateCustomerRecord,
} from "./customerRepository";
import { appendActivityRecord } from "./activityRepository";
import {
  customerCreatedActivity,
  customerUpdatedActivity,
} from "./activityEmitter";

export async function listCustomersForActor(
  actor: Actor,
): Promise<readonly CrmCustomerRecord[]> {
  assertCan(actor, "customer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  return listCustomersForWorkspace(actor.workspaceId);
}

export async function getCustomerForActor(
  actor: Actor,
  customerId: string,
): Promise<CrmCustomerRecord> {
  assertCan(actor, "customer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const row = await getCustomerInWorkspace(actor.workspaceId, customerId);
  if (!row) {
    throw new PersistenceError("not_found", "Customer not found");
  }
  return row;
}

export async function createCustomerForActor(
  actor: Actor,
  draft: CrmCustomerDraft,
): Promise<CrmCustomerRecord> {
  assertCan(actor, "customer.create", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });

  const existing = await listCustomersForWorkspace(actor.workspaceId);
  const result = validateCustomerDraft(draft, { existing });
  if (!result.ok) {
    throw new PersistenceError("validation", "Customer validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  const customer = await createCustomerRecord({
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
    ...result.value,
  });
  await appendActivityRecord({
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
    customerId: customer.id,
    ...customerCreatedActivity(customer),
  });
  return customer;
}

export async function updateCustomerForActor(
  actor: Actor,
  customerId: string,
  draft: CrmCustomerDraft,
): Promise<CrmCustomerRecord> {
  const existingRow = await getCustomerInWorkspace(actor.workspaceId, customerId);
  if (!existingRow) {
    throw new PersistenceError("not_found", "Customer not found");
  }

  assertCan(actor, "customer.update", {
    organizationId: existingRow.organizationId,
    workspaceId: actor.workspaceId,
  });

  const existing = await listCustomersForWorkspace(actor.workspaceId);
  const result = validateCustomerDraft(draft, {
    existing,
    excludeId: customerId,
  });
  if (!result.ok) {
    throw new PersistenceError("validation", "Customer validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  const customer = await updateCustomerRecord(actor.workspaceId, customerId, result.value);
  await appendActivityRecord({
    organizationId: customer.organizationId,
    workspaceId: actor.workspaceId,
    customerId: customer.id,
    ...customerUpdatedActivity(customer),
  });
  return customer;
}

export async function deleteCustomerForActor(
  actor: Actor,
  customerId: string,
): Promise<void> {
  const existingRow = await getCustomerInWorkspace(actor.workspaceId, customerId);
  if (!existingRow) {
    throw new PersistenceError("not_found", "Customer not found");
  }

  assertCan(actor, "customer.delete", {
    organizationId: existingRow.organizationId,
    workspaceId: actor.workspaceId,
  });

  await deleteCustomerRecord(actor.workspaceId, customerId);
}
