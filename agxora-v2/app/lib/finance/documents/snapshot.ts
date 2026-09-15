import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  emptyBranding,
  emptyQrSettings,
  type FinanceCustomerBlock,
  type FinanceDocumentKind,
  type FinanceDocumentSnapshot,
  type FinancePaymentQrContext,
  type FinanceQrSettingsView,
} from "./types";
import { brandingFromRow, qrFromRow } from "./validation";
import { buildPaymentQrSnapshot } from "./epcQr";

export type SnapshotCustomer = FinanceCustomerBlock;

export async function resolveWorkspaceBranding(
  actor: Actor,
  tx?: Prisma.TransactionClient,
): Promise<{
  readonly invoiceTemplate: FinanceDocumentSnapshot["template"];
  readonly deliveryNoteTemplate: FinanceDocumentSnapshot["template"];
  readonly branding: FinanceDocumentSnapshot["branding"];
  readonly qr: FinanceQrSettingsView;
}> {
  const db = tx ?? prisma;
  const [settings, organization] = await Promise.all([
    db.financeDocumentSettings.findFirst({
      where: { workspaceId: actor.workspaceId, organizationId: actor.organizationId },
    }),
    db.organization.findUnique({
      where: { id: actor.organizationId },
      select: { name: true },
    }),
  ]);
  if (!settings) {
    return {
      invoiceTemplate: "CLASSIC",
      deliveryNoteTemplate: "CLASSIC",
      branding: emptyBranding(organization?.name ?? ""),
      qr: emptyQrSettings(),
    };
  }
  const branding = brandingFromRow(settings);
  return {
    invoiceTemplate: settings.invoiceTemplate,
    deliveryNoteTemplate: settings.deliveryNoteTemplate,
    branding: {
      ...branding,
      companyName: branding.companyName || organization?.name || "",
    },
    qr: qrFromRow(settings),
  };
}

export async function captureDocumentSnapshot(
  actor: Actor,
  kind: FinanceDocumentKind,
  customer: SnapshotCustomer,
  tx?: Prisma.TransactionClient,
  paymentContext?: FinancePaymentQrContext | null,
): Promise<FinanceDocumentSnapshot> {
  const resolved = await resolveWorkspaceBranding(actor, tx);
  const snapshot: FinanceDocumentSnapshot = {
    version: 1,
    kind,
    template: kind === "INVOICE" ? resolved.invoiceTemplate : resolved.deliveryNoteTemplate,
    branding: resolved.branding,
    customer,
    frozenAt: new Date().toISOString(),
  };
  if (kind !== "INVOICE" || !paymentContext) {
    return snapshot;
  }
  return {
    ...snapshot,
    payment: buildPaymentQrSnapshot(resolved.qr, resolved.branding, paymentContext),
  };
}
