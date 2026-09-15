import { FinanceDocumentKind, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function nextDocumentNumber(
  tx: Tx,
  input: {
    readonly organizationId: string;
    readonly workspaceId: string;
    readonly kind: FinanceDocumentKind;
    readonly year: number;
  },
): Promise<string> {
  try {
    await tx.financeNumberSequence.upsert({
      where: {
        workspaceId_kind_year: {
          workspaceId: input.workspaceId,
          kind: input.kind,
          year: input.year,
        },
      },
      create: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        kind: input.kind,
        year: input.year,
        nextValue: 1,
      },
      update: {},
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const updated = await tx.financeNumberSequence.update({
    where: {
      workspaceId_kind_year: {
        workspaceId: input.workspaceId,
        kind: input.kind,
        year: input.year,
      },
    },
    data: { nextValue: { increment: 1 } },
  });

  const sequence = updated.nextValue - 1;
  const prefix = input.kind === "INVOICE" ? "RE" : "LS";
  return `${prefix}-${input.year}-${String(sequence).padStart(6, "0")}`;
}
