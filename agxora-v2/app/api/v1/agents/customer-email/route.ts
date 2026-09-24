/**
 * Approved customer email send.
 * Organization, workspace, and recipient come from the server session and CRM row.
 */

import { NextResponse } from "next/server";
import { deliverEmail } from "@/app/lib/email";
import { getAppOrigin } from "@/app/lib/email/config";
import { getCustomerForActor } from "@/app/lib/crm/persistence";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();
    const body = (await request.json()) as {
      customerId?: string;
      subject?: string;
      text?: string;
      idempotencyKey?: string;
      to?: string;
    };
    const customerId = body.customerId?.trim() ?? "";
    const subject = body.subject?.trim() ?? "";
    const text = body.text?.trim() ?? "";
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    if (!customerId || !subject || !text || !idempotencyKey) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Missing email fields" },
        { status: 400 },
      );
    }
    if (subject.length > 200 || text.length > 8000 || idempotencyKey.length > 200) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Email fields are too long" },
        { status: 400 },
      );
    }

    const customer = await getCustomerForActor(actor, customerId);
    if (customer.organizationId !== actor.organizationId) {
      return NextResponse.json(
        { ok: false, code: "not_found", message: "Customer not found" },
        { status: 404 },
      );
    }
    const recipient = customer.email.trim();
    if (!EMAIL_RE.test(recipient)) {
      return NextResponse.json(
        {
          ok: false,
          code: "validation",
          message: "A valid customer email address is required.",
          delivery: "not_configured",
        },
        { status: 422 },
      );
    }

    const { delivery, error } = await deliverEmail({
      kind: "customer_message",
      to: recipient,
      subject,
      text,
      actionUrl: `${getAppOrigin()}/dashboard`,
      idempotencyKey,
    });
    if (delivery !== "queued") {
      return NextResponse.json(
        {
          ok: false,
          delivery,
          error: error ?? "Email provider did not accept the message.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      delivery: "queued",
      recipient,
      customerId: customer.id,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
