import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import { emptyBranding, type FinanceCustomerBlock, type FinanceDocumentKind, type FinanceDocumentSnapshot } from "./types";
import { brandingFromRow } from "./validation";

export type SnapshotCustomer = FinanceCustomerBlock;

export async function resolveWorkspaceBranding(
  actor: Actor,
  tx?: Prisma.TransactionClient,
): Promise<{
  readonly invoiceTemplate: FinanceDocumentSnapshot["template"];
  readonly deliveryNoteTemplate: FinanceDocumentSnapshot["template"];
  readonly branding: FinanceDocumentSnapshot["branding"];
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
  };
}

export async function captureDocumentSnapshot(
  actor: Actor,
  kind: FinanceDocumentKind,
  customer: SnapshotCustomer,
  tx?: Prisma.TransactionClient,
): Promise<FinanceDocumentSnapshot> {
  const resolved = await resolveWorkspaceBranding(actor, tx);
  return {
    version: 1,
    kind,
    template: kind === "INVOICE" ? resolved.invoiceTemplate : resolved.deliveryNoteTemplate,
    branding: resolved.branding,
    customer,
    frozenAt: new Date().toISOString(),
  };
}
