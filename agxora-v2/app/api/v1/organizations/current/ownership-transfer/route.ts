import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/app/lib/tenancy";
import {
  cancelOwnershipTransfer,
  getPendingOwnershipTransfer,
  initiateOwnershipTransfer,
} from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const transfer = await getPendingOwnershipTransfer(actor);
    return NextResponse.json({ ok: true, transfer });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const limited = rateLimitResponse({
      request,
      policyId: "control.ownership_transfer_initiate",
      userId: actor.userId,
    });
    if (limited) return limited;

    const body = (await request.json()) as Record<string, unknown>;
    const { transfer, token, delivery } = await initiateOwnershipTransfer(actor, {
      targetUserId: body.targetUserId,
    });

    const queued = delivery === "queued";
    return NextResponse.json(
      {
        ok: true,
        transfer,
        delivery,
        ...(queued
          ? {
              message:
                "Ownership transfer initiated. Confirmation email was queued for the recipient.",
            }
          : {
              token,
              confirmPath: `/ownership-transfer/${token}`,
              message:
                "Ownership transfer initiated. Email delivery is not configured — share the confirmation link directly with the recipient.",
            }),
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    let transferId: string | undefined;
    try {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body.transferId === "string") transferId = body.transferId;
    } catch {
      // empty body is fine — cancel the current pending transfer
    }
    const transfer = await cancelOwnershipTransfer(actor, transferId);
    return NextResponse.json({ ok: true, transfer });
  } catch (error) {
    return jsonError(error);
  }
}
