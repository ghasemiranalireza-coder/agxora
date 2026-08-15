/**
 * PostgreSQL note repository — workspace-scoped, no React.
 * Phase 48 — Notes only (Documents / Activities deferred).
 */

import "server-only";

import { prisma } from "../../db/prisma";
import { PersistenceError } from "../../tenancy/errors";
import type { ValidatedNotePayload } from "../directory/validation";
import { toCrmNoteRecord } from "./mappers";
import type { CrmNoteRecord } from "../directory/types";

export type NoteCreateInput = ValidatedNotePayload & {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
};

export async function listNotesForCustomerInWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<readonly CrmNoteRecord[]> {
  const rows = await prisma.note.findMany({
    where: { workspaceId, customerId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toCrmNoteRecord);
}

export async function getNoteInWorkspace(
  workspaceId: string,
  noteId: string,
): Promise<CrmNoteRecord | null> {
  const row = await prisma.note.findFirst({
    where: { id: noteId, workspaceId },
  });
  return row ? toCrmNoteRecord(row) : null;
}

export async function createNoteRecord(
  input: NoteCreateInput,
): Promise<CrmNoteRecord> {
  try {
    const row = await prisma.note.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        title: input.title,
        body: input.body,
        author: input.author,
      },
    });
    return toCrmNoteRecord(row);
  } catch (error) {
    throw new PersistenceError("persistence", "Failed to create note", {
      details: [{ message: error instanceof Error ? error.message : "unknown" }],
    });
  }
}

export async function updateNoteRecord(
  workspaceId: string,
  noteId: string,
  patch: ValidatedNotePayload,
): Promise<CrmNoteRecord> {
  const existing = await prisma.note.findFirst({
    where: { id: noteId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Note not found");
  }

  try {
    const row = await prisma.note.update({
      where: { id: noteId },
      data: {
        title: patch.title,
        body: patch.body,
        author: patch.author,
      },
    });
    return toCrmNoteRecord(row);
  } catch {
    throw new PersistenceError("persistence", "Failed to update note");
  }
}

export async function deleteNoteRecord(
  workspaceId: string,
  noteId: string,
): Promise<void> {
  const existing = await prisma.note.findFirst({
    where: { id: noteId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Note not found");
  }

  try {
    await prisma.note.delete({ where: { id: noteId } });
  } catch {
    throw new PersistenceError("persistence", "Failed to delete note");
  }
}
