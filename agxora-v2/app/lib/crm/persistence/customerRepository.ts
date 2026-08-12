/**
 * PostgreSQL customer repository — workspace-scoped, no React.
 */

import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { PersistenceError } from "../../tenancy/errors";
import type { ValidatedCustomerPayload } from "../directory/validation";
import { toCrmCustomerRecord, toDbStatus } from "./mappers";
import type { CrmCustomerRecord } from "../directory/types";

export type CustomerCreateInput = ValidatedCustomerPayload & {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly isSample?: boolean;
};

export async function listCustomersForWorkspace(
  workspaceId: string,
): Promise<readonly CrmCustomerRecord[]> {
  const rows = await prisma.customer.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCrmCustomerRecord);
}

export async function getCustomerInWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<CrmCustomerRecord | null> {
  const row = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
  });
  return row ? toCrmCustomerRecord(row) : null;
}

export async function createCustomerRecord(
  input: CustomerCreateInput,
): Promise<CrmCustomerRecord> {
  try {
    const row = await prisma.customer.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        website: input.website,
        industry: input.industry,
        country: input.country,
        city: input.city,
        address: input.address,
        taxNumber: input.taxNumber,
        status: toDbStatus(input.status),
        owner: input.owner,
        tags: input.tags as unknown as Prisma.InputJsonValue,
        isSample: input.isSample ?? false,
      },
    });
    return toCrmCustomerRecord(row);
  } catch (error) {
    throw new PersistenceError("persistence", "Failed to create customer", {
      details: [{ message: error instanceof Error ? error.message : "unknown" }],
    });
  }
}

export async function updateCustomerRecord(
  workspaceId: string,
  customerId: string,
  patch: ValidatedCustomerPayload,
): Promise<CrmCustomerRecord> {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Customer not found");
  }

  try {
    const row = await prisma.customer.update({
      where: { id: customerId },
      data: {
        companyName: patch.companyName,
        contactName: patch.contactName,
        email: patch.email,
        phone: patch.phone,
        website: patch.website,
        industry: patch.industry,
        country: patch.country,
        city: patch.city,
        address: patch.address,
        taxNumber: patch.taxNumber,
        status: toDbStatus(patch.status),
        owner: patch.owner,
        tags: patch.tags as unknown as Prisma.InputJsonValue,
      },
    });
    return toCrmCustomerRecord(row);
  } catch {
    throw new PersistenceError("persistence", "Failed to update customer");
  }
}

export async function deleteCustomerRecord(
  workspaceId: string,
  customerId: string,
): Promise<void> {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new PersistenceError("not_found", "Customer not found");
  }

  try {
    await prisma.customer.delete({ where: { id: customerId } });
  } catch {
    throw new PersistenceError("persistence", "Failed to delete customer");
  }
}
