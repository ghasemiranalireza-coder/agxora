/**
 * PostgreSQL contact repository — workspace-scoped, no React.
 * Phase 47 — Contacts only (Notes deferred).
 */

import "server-only";

import { prisma } from "../../db/prisma";
import { PersistenceError } from "../../tenancy/errors";
import type { ValidatedContactPayload } from "../directory/validation";
import { toCrmContactRecord } from "./mappers";
import type { CrmContactRecord } from "../directory/types";

export type ContactCreateInput = ValidatedContactPayload & {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
};

export async function listContactsForCustomerInWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<readonly CrmContactRecord[]> {
  const rows = await prisma.contact.findMany({
    where: { workspaceId, customerId },
    orderBy: { name: "asc" },
  });
  return rows.map(toCrmContactRecord);
}

export async function getContactInWorkspace(
  workspaceId: string,
  contactId: string,
): Promise<CrmContactRecord | null> {
  const row = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
  });
  return row ? toCrmContactRecord(row) : null;
}

export async function createContactRecord(
  input: ContactCreateInput,
): Promise<CrmContactRecord> {
  try {
    const row = await prisma.contact.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        name: input.name,
        role: input.role,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        notes: input.notes,
      },
    });
    return toCrmContactRecord(row);
  } catch (error) {
    throw new PersistenceError("persistence", "Failed to create contact", {
      details: [{ message: error instanceof Error ? error.message : "unknown" }],
    });
  }
}

export async function updateContactRecord(
  workspaceId: string,
  contactId: string,
  patch: ValidatedContactPayload,
): Promise<CrmContactRecord> {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Contact not found");
  }

  try {
    const row = await prisma.contact.update({
      where: { id: contactId },
      data: {
        name: patch.name,
        role: patch.role,
        email: patch.email,
        phone: patch.phone,
        mobile: patch.mobile,
        notes: patch.notes,
      },
    });
    return toCrmContactRecord(row);
  } catch {
    throw new PersistenceError("persistence", "Failed to update contact");
  }
}

export async function deleteContactRecord(
  workspaceId: string,
  contactId: string,
): Promise<void> {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Contact not found");
  }

  try {
    await prisma.contact.delete({ where: { id: contactId } });
  } catch {
    throw new PersistenceError("persistence", "Failed to delete contact");
  }
}
