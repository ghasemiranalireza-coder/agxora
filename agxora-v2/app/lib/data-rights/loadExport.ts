/**
 * Load one organization's export. The organization id comes from the server actor.
 */

import { loadExportableSubscription } from "@/app/lib/billing/service";
import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy";
import { assembleOrganizationExport } from "./buildExport";
import { projectGovernedEvidence } from "./evidenceProjection";

function iso(value: Date): string {
  return value.toISOString();
}

export async function loadOrganizationExport(actor: Actor, generatedAt = new Date().toISOString()) {
  const organizationId = actor.organizationId;
  const [organization, memberships, customers, contacts, notes, activities, documents, invoices, deliveryNotes, financeSettings, agentOs, executions, evidence, commercialSubscription] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } }),
      prisma.membership.findMany({
        where: { organizationId },
        select: {
          id: true,
          role: true,
          status: true,
          user: { select: { id: true, email: true, name: true, emailVerified: true } },
        },
      }),
      prisma.customer.findMany({ where: { organizationId } }),
      prisma.contact.findMany({ where: { organizationId } }),
      prisma.note.findMany({ where: { organizationId } }),
      prisma.customerActivity.findMany({ where: { organizationId } }),
      prisma.customerDocument.findMany({
        where: { organizationId },
        select: {
          id: true,
          customerId: true,
          name: true,
          mimeType: true,
          size: true,
          uploadedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.invoice.findMany({ where: { organizationId }, include: { items: true } }),
      prisma.deliveryNote.findMany({ where: { organizationId }, include: { items: true } }),
      prisma.financeDocumentSettings.findMany({
        where: { organizationId },
        select: {
          id: true,
          workspaceId: true,
          companyName: true,
          street: true,
          postalCode: true,
          city: true,
          country: true,
          phone: true,
          email: true,
          website: true,
          vatId: true,
          taxNumber: true,
          iban: true,
          bic: true,
          commercialRegister: true,
          managingDirector: true,
          invoiceTemplate: true,
          deliveryNoteTemplate: true,
        },
      }),
      prisma.agentOsState.findUnique({ where: { organizationId }, select: { payload: true } }),
      prisma.agentGovernedExecution.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } }),
      prisma.agentGovernedEvidence.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" }, take: 500 }),
      loadExportableSubscription(organizationId),
    ]);

  if (!organization) {
    return null;
  }

  const executionById = new Map(executions.map((row) => [row.executionId, row]));
  return assembleOrganizationExport({
    generatedAt,
    organization,
    memberships: memberships.map((row) => ({
      id: row.id,
      role: row.role,
      status: row.status,
      userId: row.user.id,
      email: row.user.email,
      name: row.user.name,
      emailVerified: row.user.emailVerified,
    })),
    customers,
    contacts,
    notes,
    activities,
    documentMetadata: documents.map((row) => ({ ...row, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
    invoices,
    deliveryNotes,
    financeSettings,
    agentOsPayload: agentOs?.payload ?? {},
    governedExecutions: executions.map((row) => ({
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      executionId: row.executionId,
      status: row.status,
      capabilityId: row.capabilityId,
      workerId: row.workerId,
      actorId: row.actorId,
      approvalGranted: row.approvalGranted,
      verificationStatus: row.verificationStatus,
      outcome: row.outcome,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
    governedEvidence: evidence.map((row) =>
      projectGovernedEvidence(row, executionById.get(row.executionId) ?? null) as unknown as Record<string, unknown>,
    ),
    commercialSubscription,
  });
}
