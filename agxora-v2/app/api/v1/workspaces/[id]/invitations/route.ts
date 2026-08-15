import { NextResponse } from "next/server";
import { requireActorForWorkspace } from "@/app/lib/tenancy";
import { createInvitation, listInvitations } from "@/app/lib/control-plane";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireDatabase } from "@/app/lib/auth/server/http";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly id: string }> };

export async function GET(
  _request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id } = await context.params;
    const actor = await requireActorForWorkspace(id);
    const invitations = await listInvitations(actor);
    return NextResponse.json({ ok: true, invitations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const { id } = await context.params;
    const actor = await requireActorForWorkspace(id);
    const body = (await request.json()) as Record<string, unknown>;
    const { invitation, token, delivery } = await createInvitation(actor, {
      email: body.email,
      role: body.role,
    });

    const queued = delivery === "queued";
    // When email was handed off, do not return the raw token in the JSON body.
    // Operators can still share manually when delivery remains not_configured.
    return NextResponse.json(
      {
        ok: true,
        invitation,
        delivery,
        ...(queued
          ? {
              message:
                "Invitation created and email delivery was queued for the recipient.",
            }
          : {
              token,
              acceptPath: `/invite/${token}`,
              message:
                "Invitation created. Email delivery is not configured — share the invite link directly.",
            }),
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
