/**
 * PostgreSQL customer document metadata repository — workspace-scoped, no React.
 * Phase 49 — metadata only (Activities / blob storage deferred).
 */

import "server-only";

import { prisma } from "../../db/prisma";
import { PersistenceError } from "../../tenancy/errors";
import type { ValidatedDocumentPayload } from "../directory/validation";
import { toCrmDocumentRecord } from "./mappers";
import type { CrmDocumentRecord } from "../directory/types";

export type DocumentCreateInput = ValidatedDocumentPayload & {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
};

export async function listDocumentsForCustomerInWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<readonly CrmDocumentRecord[]> {
  const rows = await prisma.customerDocument.findMany({
    where: { workspaceId, customerId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCrmDocumentRecord);
}

export async function getDocumentInWorkspace(
  workspaceId: string,
  documentId: string,
): Promise<CrmDocumentRecord | null> {
  const row = await prisma.customerDocument.findFirst({
    where: { id: documentId, workspaceId },
  });
  return row ? toCrmDocumentRecord(row) : null;
}

export async function createDocumentRecord(
  input: DocumentCreateInput,
): Promise<CrmDocumentRecord> {
  try {
    const row = await prisma.customerDocument.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        name: input.name,
        mimeType: input.mimeType,
        size: input.size,
        uploadedBy: input.uploadedBy,
      },
    });
    return toCrmDocumentRecord(row);
  } catch (error) {
    throw new PersistenceError("persistence", "Failed to create document", {
      details: [{ message: error instanceof Error ? error.message : "unknown" }],
    });
  }
}

export async function deleteDocumentRecord(
  workspaceId: string,
  documentId: string,
): Promise<void> {
  const existing = await prisma.customerDocument.findFirst({
    where: { id: documentId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Document not found");
  }

  try {
    await prisma.customerDocument.delete({ where: { id: documentId } });
  } catch {
    throw new PersistenceError("persistence", "Failed to delete document");
  }
}
