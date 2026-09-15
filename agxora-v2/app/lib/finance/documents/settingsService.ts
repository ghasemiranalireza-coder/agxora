import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import { assertFinance } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireFirstCustomerProductionReady } from "@/app/lib/production/requireReady";
import { assertUuid } from "../core/validation";
import {
  emptyBranding,
  type FinanceDocumentSettingsPatch,
  type FinanceDocumentSettingsView,
} from "./types";
import { brandingFromRow, parseSettingsPatch } from "./validation";

function tenant(actor: Actor) {
  return { organizationId: actor.organizationId, workspaceId: actor.workspaceId };
}

export async function getDocumentSettingsForActor(
  actor: Actor,
): Promise<FinanceDocumentSettingsView> {
  requireFirstCustomerProductionReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const [settings, organization] = await Promise.all([
    prisma.financeDocumentSettings.findFirst({
      where: { workspaceId: actor.workspaceId, organizationId: actor.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { name: true },
    }),
  ]);
  if (!settings) {
    return {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      invoiceTemplate: "CLASSIC",
      deliveryNoteTemplate: "CLASSIC",
      branding: emptyBranding(organization?.name ?? ""),
      persisted: false,
      updatedAt: null,
    };
  }
  const branding = brandingFromRow(settings);
  return {
    organizationId: settings.organizationId,
    workspaceId: settings.workspaceId,
    invoiceTemplate: settings.invoiceTemplate,
    deliveryNoteTemplate: settings.deliveryNoteTemplate,
    branding: {
      ...branding,
      companyName: branding.companyName || organization?.name || "",
    },
    persisted: true,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function patchDocumentSettingsForActor(
  actor: Actor,
  input: FinanceDocumentSettingsPatch,
): Promise<FinanceDocumentSettingsView> {
  requireFirstCustomerProductionReady();
  assertFinance(actor, "finance.document_settings", tenant(actor));
  const patch = parseSettingsPatch(input);
  const organization = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    select: { name: true },
  });
  const existing = await prisma.financeDocumentSettings.findFirst({
    where: { workspaceId: actor.workspaceId, organizationId: actor.organizationId },
  });
  const next = {
    invoiceTemplate: patch.invoiceTemplate ?? existing?.invoiceTemplate ?? "CLASSIC",
    deliveryNoteTemplate: patch.deliveryNoteTemplate ?? existing?.deliveryNoteTemplate ?? "CLASSIC",
    companyName: patch.companyName ?? existing?.companyName ?? organization?.name ?? "",
    street: patch.street ?? existing?.street ?? "",
    postalCode: patch.postalCode ?? existing?.postalCode ?? "",
    city: patch.city ?? existing?.city ?? "",
    country: patch.country ?? existing?.country ?? "",
    phone: patch.phone ?? existing?.phone ?? "",
    email: patch.email ?? existing?.email ?? "",
    website: patch.website ?? existing?.website ?? "",
    vatId: patch.vatId ?? existing?.vatId ?? "",
    taxNumber: patch.taxNumber ?? existing?.taxNumber ?? "",
    iban: patch.iban ?? existing?.iban ?? "",
    bic: patch.bic ?? existing?.bic ?? "",
    commercialRegister: patch.commercialRegister ?? existing?.commercialRegister ?? "",
    managingDirector: patch.managingDirector ?? existing?.managingDirector ?? "",
    primaryColor: patch.primaryColor ?? existing?.primaryColor ?? "#1B365D",
    secondaryColor: patch.secondaryColor ?? existing?.secondaryColor ?? "#C4A35A",
  };

  const saved = await prisma.$transaction(async (tx) => {
    const row = existing
      ? await tx.financeDocumentSettings.update({
          where: { id: existing.id },
          data: next,
        })
      : await tx.financeDocumentSettings.create({
          data: {
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            ...next,
          },
        });
    await tx.controlPlaneAuditEvent.create({
      data: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        actorUserId: actor.userId,
        action: "finance_document_settings_updated",
        metadata: {
          invoiceTemplate: row.invoiceTemplate,
          deliveryNoteTemplate: row.deliveryNoteTemplate,
        },
      },
    });
    return row;
  });

  return {
    organizationId: saved.organizationId,
    workspaceId: saved.workspaceId,
    invoiceTemplate: saved.invoiceTemplate,
    deliveryNoteTemplate: saved.deliveryNoteTemplate,
    branding: brandingFromRow(saved),
    persisted: true,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

export async function getFinanceLogoBytesForActor(
  actor: Actor,
  logoId: string,
): Promise<{ readonly mimeType: string; readonly bytes: Uint8Array; readonly fileName: string }> {
  requireFirstCustomerProductionReady();
  assertFinance(actor, "finance.read", tenant(actor));
  const logo = await prisma.financeDocumentLogo.findFirst({
    where: {
      id: assertUuid(logoId, "logoId"),
      workspaceId: actor.workspaceId,
      organizationId: actor.organizationId,
    },
    select: { mimeType: true, bytes: true, fileName: true },
  });
  if (!logo) {
    throw new PersistenceError("not_found", "Logo not found");
  }
  return logo;
}

export async function uploadFinanceLogoForActor(
  actor: Actor,
  file: { readonly bytes: Uint8Array; readonly fileName: string; readonly claimedType?: string },
): Promise<FinanceDocumentSettingsView> {
  requireFirstCustomerProductionReady();
  assertFinance(actor, "finance.document_settings", tenant(actor));
  const { assertSafeLogoBytes } = await import("./validation");
  const mimeType = assertSafeLogoBytes(file.bytes, file.claimedType);
  const safeName = file.fileName.replace(/[^\w.\-]+/g, "_").slice(0, 80);

  const saved = await prisma.$transaction(async (tx) => {
    const logo = await tx.financeDocumentLogo.create({
      data: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        mimeType,
        fileName: safeName,
        byteSize: file.bytes.byteLength,
        bytes: Buffer.from(file.bytes),
        uploadedByUserId: actor.userId,
      },
    });
    const existing = await tx.financeDocumentSettings.findFirst({
      where: { workspaceId: actor.workspaceId, organizationId: actor.organizationId },
    });
    const row = existing
      ? await tx.financeDocumentSettings.update({
          where: { id: existing.id },
          data: { logoId: logo.id },
        })
      : await tx.financeDocumentSettings.create({
          data: {
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            companyName: (await tx.organization.findUnique({
              where: { id: actor.organizationId },
              select: { name: true },
            }))?.name ?? "",
            logoId: logo.id,
          },
        });
    await tx.controlPlaneAuditEvent.create({
      data: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        actorUserId: actor.userId,
        action: "finance_logo_uploaded",
        metadata: { logoId: logo.id, mimeType, byteSize: logo.byteSize },
      },
    });
    return row;
  });

  return {
    organizationId: saved.organizationId,
    workspaceId: saved.workspaceId,
    invoiceTemplate: saved.invoiceTemplate,
    deliveryNoteTemplate: saved.deliveryNoteTemplate,
    branding: brandingFromRow(saved),
    persisted: true,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

export async function removeFinanceLogoForActor(actor: Actor): Promise<FinanceDocumentSettingsView> {
  requireFirstCustomerProductionReady();
  assertFinance(actor, "finance.document_settings", tenant(actor));
  const existing = await prisma.financeDocumentSettings.findFirst({
    where: { workspaceId: actor.workspaceId, organizationId: actor.organizationId },
  });
  if (!existing) {
    return getDocumentSettingsForActor(actor);
  }
  const saved = await prisma.$transaction(async (tx) => {
    const row = await tx.financeDocumentSettings.update({
      where: { id: existing.id },
      data: { logoId: null },
    });
    await tx.controlPlaneAuditEvent.create({
      data: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        actorUserId: actor.userId,
        action: "finance_logo_removed",
        metadata: { previousLogoId: existing.logoId },
      },
    });
    return row;
  });
  return {
    organizationId: saved.organizationId,
    workspaceId: saved.workspaceId,
    invoiceTemplate: saved.invoiceTemplate,
    deliveryNoteTemplate: saved.deliveryNoteTemplate,
    branding: brandingFromRow(saved),
    persisted: true,
    updatedAt: saved.updatedAt.toISOString(),
  };
}
