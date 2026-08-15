/**
 * Application service — authz + validation + contact repository.
 * Phase 47 — Contacts reuse customer.* CRM permissions.
 */

import "server-only";

import type { Actor } from "../../tenancy/types";
import { assertCan } from "../../tenancy/authorize";
import { PersistenceError } from "../../tenancy/errors";
import type { CrmContactDraft, CrmContactRecord } from "../directory/types";
import { validateContactDraft } from "../directory/validation";
import { getCustomerInWorkspace } from "./customerRepository";
import {
  createContactRecord,
  deleteContactRecord,
  getContactInWorkspace,
  listContactsForCustomerInWorkspace,
  updateContactRecord,
} from "./contactRepository";

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

export async function listContactsForActor(
  actor: Actor,
  customerId: string,
): Promise<readonly CrmContactRecord[]> {
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.read", parent);
  return listContactsForCustomerInWorkspace(actor.workspaceId, customerId);
}

export async function getContactForActor(
  actor: Actor,
  contactId: string,
): Promise<CrmContactRecord> {
  assertCan(actor, "customer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const row = await getContactInWorkspace(actor.workspaceId, contactId);
  if (!row) {
    throw new PersistenceError("not_found", "Contact not found");
  }
  if (row.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  return row;
}

export async function createContactForActor(
  actor: Actor,
  customerId: string,
  draft: CrmContactDraft,
): Promise<CrmContactRecord> {
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.create", parent);

  const result = validateContactDraft(draft);
  if (!result.ok) {
    throw new PersistenceError("validation", "Contact validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  return createContactRecord({
    organizationId: parent.organizationId,
    workspaceId: parent.workspaceId,
    customerId,
    ...result.value,
  });
}

export async function updateContactForActor(
  actor: Actor,
  contactId: string,
  draft: CrmContactDraft,
): Promise<CrmContactRecord> {
  const existing = await getContactInWorkspace(actor.workspaceId, contactId);
  if (!existing) {
    throw new PersistenceError("not_found", "Contact not found");
  }
  if (existing.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }

  // Re-verify parent customer still exists in this workspace (ownership).
  await requireCustomerInActorWorkspace(actor, existing.customerId);

  assertCan(actor, "customer.update", {
    organizationId: existing.organizationId,
    workspaceId: actor.workspaceId,
  });

  const result = validateContactDraft(draft);
  if (!result.ok) {
    throw new PersistenceError("validation", "Contact validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  return updateContactRecord(actor.workspaceId, contactId, result.value);
}

export async function deleteContactForActor(
  actor: Actor,
  contactId: string,
): Promise<void> {
  const existing = await getContactInWorkspace(actor.workspaceId, contactId);
  if (!existing) {
    throw new PersistenceError("not_found", "Contact not found");
  }
  if (existing.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }

  await requireCustomerInActorWorkspace(actor, existing.customerId);

  assertCan(actor, "customer.delete", {
    organizationId: existing.organizationId,
    workspaceId: actor.workspaceId,
  });

  await deleteContactRecord(actor.workspaceId, contactId);
}
