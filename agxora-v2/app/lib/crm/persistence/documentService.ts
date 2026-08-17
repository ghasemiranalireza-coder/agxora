/**
 * Application service — authz + validation + document metadata repository.
 * Phase 49 — Documents reuse customer.* CRM permissions.
 */

import "server-only";

import type { Actor } from "../../tenancy/types";
import { assertCan } from "../../tenancy/authorize";
import { PersistenceError } from "../../tenancy/errors";
import type { CrmDocumentDraft, CrmDocumentRecord } from "../directory/types";
import { validateDocumentDraft } from "../directory/validation";
import { getCustomerInWorkspace } from "./customerRepository";
import {
  createDocumentRecord,
  deleteDocumentRecord,
  getDocumentInWorkspace,
  listDocumentsForCustomerInWorkspace,
} from "./documentRepository";

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

export async function listDocumentsForActor(
  actor: Actor,
  customerId: string,
): Promise<readonly CrmDocumentRecord[]> {
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.read", parent);
  return listDocumentsForCustomerInWorkspace(actor.workspaceId, customerId);
}

export async function getDocumentForActor(
  actor: Actor,
  documentId: string,
): Promise<CrmDocumentRecord> {
  assertCan(actor, "customer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const row = await getDocumentInWorkspace(actor.workspaceId, documentId);
  if (!row) {
    throw new PersistenceError("not_found", "Document not found");
  }
  if (row.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  return row;
}

export async function createDocumentForActor(
  actor: Actor,
  customerId: string,
  draft: CrmDocumentDraft,
): Promise<CrmDocumentRecord> {
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.create", parent);

  const result = validateDocumentDraft(draft);
  if (!result.ok) {
    throw new PersistenceError("validation", "Document validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  return createDocumentRecord({
    organizationId: parent.organizationId,
    workspaceId: parent.workspaceId,
    customerId,
    ...result.value,
  });
}

export async function deleteDocumentForActor(
  actor: Actor,
  documentId: string,
): Promise<void> {
  const existing = await getDocumentInWorkspace(actor.workspaceId, documentId);
  if (!existing) {
    throw new PersistenceError("not_found", "Document not found");
  }
  if (existing.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }

  await requireCustomerInActorWorkspace(actor, existing.customerId);

  assertCan(actor, "customer.delete", {
    organizationId: existing.organizationId,
    workspaceId: actor.workspaceId,
  });

  await deleteDocumentRecord(actor.workspaceId, documentId);
}
