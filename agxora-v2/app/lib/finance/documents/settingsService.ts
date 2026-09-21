import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import { assertFinance } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireFirstCustomerProductionReady } from "@/app/lib/production/requireReady";
import { assertUuid } from "../core/validation";
import {
  emptyBranding,
  emptyQrSettings,
  type FinanceDocumentSettingsPatch,
  type FinanceDocumentSettingsView,
} from "./types";
import { brandingFromRow, parseSettingsPatch, qrFromRow } from "./validation";
import {
  buildOnboardingFinancePatch,
  hasOnboardingFinancePatch,
  type OnboardingFinanceInput,
} from "./onboardingFinanceSeed";

function tenant(actor: Actor) {
  return { organizationId: actor.organizationId, workspaceId: actor.workspaceId };
}

function toSettingsView(
  row: {
    readonly organizationId: string;
    readonly workspaceId: string;
    readonly invoiceTemplate: FinanceDocumentSettingsView["invoiceTemplate"];
    readonly deliveryNoteTemplate: FinanceDocumentSettingsView["deliveryNoteTemplate"];
    readonly companyName: string;
    readonly street: string;
    readonly postalCode: string;
    readonly city: string;
    readonly country: string;
    readonly phone: string;
    readonly email: string;
    readonly website: string;
    readonly vatId: string;
    readonly taxNumber: string;
    readonly iban: string;
    readonly bic: string;
    readonly commercialRegister: string;
    readonly managingDirector: string;
    readonly primaryColor: string;
    readonly secondaryColor: string;
    readonly logoId: string | null;
    readonly qrEnabled: boolean;
    readonly qrPosition: string;
    readonly qrIncludeAmount: boolean;
    readonly qrIncludeInvoiceNumber: boolean;
    readonly qrIncludeCustomerName: boolean;
    readonly qrRemittanceText: string;
    readonly updatedAt: Date;
  },
  organizationName = "",
): FinanceDocumentSettingsView {
  const branding = brandingFromRow(row);
  return {
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    invoiceTemplate: row.invoiceTemplate,
    deliveryNoteTemplate: row.deliveryNoteTemplate,
    branding: {
      ...branding,
      companyName: branding.companyName || organizationName,
    },
    qr: qrFromRow(row),
    persisted: true,
    updatedAt: row.updatedAt.toISOString(),
  };
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
      qr: emptyQrSettings(),
      persisted: false,
      updatedAt: null,
    };
  }
  return toSettingsView(settings, organization?.name ?? "");
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
    qrEnabled: patch.qrEnabled ?? existing?.qrEnabled ?? true,
    qrPosition: patch.qrPosition ?? existing?.qrPosition ?? "BOTTOM_RIGHT",
    qrIncludeAmount: patch.qrIncludeAmount ?? existing?.qrIncludeAmount ?? true,
    qrIncludeInvoiceNumber: patch.qrIncludeInvoiceNumber ?? existing?.qrIncludeInvoiceNumber ?? true,
    qrIncludeCustomerName: patch.qrIncludeCustomerName ?? existing?.qrIncludeCustomerName ?? false,
    qrRemittanceText: patch.qrRemittanceText ?? existing?.qrRemittanceText ?? "",
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
          qrEnabled: row.qrEnabled,
        },
      },
    });
    return row;
  });

  return toSettingsView(saved, organization?.name ?? "");
}

/**
 * First-customer onboarding write-through into FinanceDocumentSettings.
 * Uses the same actor/tenant/authorization path as Settings → Finance.
 * Empty optional fields are omitted so existing values are preserved.
 */
export async function applyOnboardingFinanceSettingsForActor(
  actor: Actor,
  input: OnboardingFinanceInput,
): Promise<FinanceDocumentSettingsView> {
  const patch = buildOnboardingFinancePatch(input);
  if (!hasOnboardingFinancePatch(patch)) {
    return getDocumentSettingsForActor(actor);
  }
  return patchDocumentSettingsForActor(actor, patch);
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

  return toSettingsView(saved);
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
  return toSettingsView(saved);
}
