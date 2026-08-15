/**
 * Application service — authz + validation + note repository.
 * Phase 48 — Notes reuse customer.* CRM permissions.
 */

import "server-only";

import type { Actor } from "../../tenancy/types";
import { assertCan } from "../../tenancy/authorize";
import { PersistenceError } from "../../tenancy/errors";
import type { CrmNoteDraft, CrmNoteRecord } from "../directory/types";
import { validateNoteDraft } from "../directory/validation";
import { getCustomerInWorkspace } from "./customerRepository";
import {
  createNoteRecord,
  deleteNoteRecord,
  getNoteInWorkspace,
  listNotesForCustomerInWorkspace,
  updateNoteRecord,
} from "./noteRepository";

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

export async function listNotesForActor(
  actor: Actor,
  customerId: string,
): Promise<readonly CrmNoteRecord[]> {
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.read", parent);
  return listNotesForCustomerInWorkspace(actor.workspaceId, customerId);
}

export async function getNoteForActor(
  actor: Actor,
  noteId: string,
): Promise<CrmNoteRecord> {
  assertCan(actor, "customer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const row = await getNoteInWorkspace(actor.workspaceId, noteId);
  if (!row) {
    throw new PersistenceError("not_found", "Note not found");
  }
  if (row.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }
  return row;
}

export async function createNoteForActor(
  actor: Actor,
  customerId: string,
  draft: CrmNoteDraft,
): Promise<CrmNoteRecord> {
  const parent = await requireCustomerInActorWorkspace(actor, customerId);
  assertCan(actor, "customer.create", parent);

  const result = validateNoteDraft(draft);
  if (!result.ok) {
    throw new PersistenceError("validation", "Note validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  return createNoteRecord({
    organizationId: parent.organizationId,
    workspaceId: parent.workspaceId,
    customerId,
    ...result.value,
  });
}

export async function updateNoteForActor(
  actor: Actor,
  noteId: string,
  draft: CrmNoteDraft,
): Promise<CrmNoteRecord> {
  const existing = await getNoteInWorkspace(actor.workspaceId, noteId);
  if (!existing) {
    throw new PersistenceError("not_found", "Note not found");
  }
  if (existing.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }

  await requireCustomerInActorWorkspace(actor, existing.customerId);

  assertCan(actor, "customer.update", {
    organizationId: existing.organizationId,
    workspaceId: actor.workspaceId,
  });

  const result = validateNoteDraft(draft);
  if (!result.ok) {
    throw new PersistenceError("validation", "Note validation failed", {
      details: result.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  return updateNoteRecord(actor.workspaceId, noteId, result.value);
}

export async function deleteNoteForActor(
  actor: Actor,
  noteId: string,
): Promise<void> {
  const existing = await getNoteInWorkspace(actor.workspaceId, noteId);
  if (!existing) {
    throw new PersistenceError("not_found", "Note not found");
  }
  if (existing.organizationId !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Tenant boundary violation");
  }

  await requireCustomerInActorWorkspace(actor, existing.customerId);

  assertCan(actor, "customer.delete", {
    organizationId: existing.organizationId,
    workspaceId: actor.workspaceId,
  });

  await deleteNoteRecord(actor.workspaceId, noteId);
}
