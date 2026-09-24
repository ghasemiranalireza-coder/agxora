/**
 * Approved customer email send.
 * Organization, workspace, and recipient come from the server session and CRM row.
 */

import { NextResponse } from "next/server";
import {
  claimGovernedExecutionDb,
  completeGovernedExecutionDb,
  failGovernedExecutionDb,
} from "@/app/lib/agents/governedExecutionDb";
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
    const requestedTo = body.to?.trim() ?? "";
    if (requestedTo && requestedTo.toLowerCase() !== recipient.toLowerCase()) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "Recipient does not match the customer email.", delivery: "not_configured" },
        { status: 422 },
      );
    }
    if (process.env.NODE_ENV === "production" && /@(e2e\.test|example\.com|example\.org|test\.com)$/i.test(recipient)) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "A production recipient is required.", delivery: "not_configured" },
        { status: 422 },
      );
    }
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

    const claim = await claimGovernedExecutionDb({
      organizationId: actor.organizationId,
      idempotencyKey,
      executionId: idempotencyKey,
      capabilityId: "COMMUNICATION_SEND_EMAIL",
      actorId: actor.userId,
      approvalRequired: true,
      approvalGranted: true,
    });
    if (claim.kind === "replay") {
      if (claim.outcome.delivery !== "queued") {
        return NextResponse.json(
          { ok: false, code: "conflict", message: "This email execution did not queue.", delivery: "not_configured" },
          { status: 409 },
        );
      }
      return NextResponse.json({
        ok: true,
        delivery: "queued",
        recipient,
        customerId: customer.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        replayed: true,
      });
    }
    if (claim.kind === "in_progress") {
      return NextResponse.json(
        { ok: false, code: "conflict", message: "This email execution is already in progress.", delivery: "not_configured" },
        { status: 409 },
      );
    }

    let delivery: "queued" | "not_configured";
    let error: string | undefined;
    try {
      const sent = await deliverEmail({
        kind: "customer_message",
        to: recipient,
        subject,
        text,
        actionUrl: `${getAppOrigin()}/dashboard`,
        idempotencyKey,
      });
      delivery = sent.delivery;
      error = sent.error;
    } catch (sendError) {
      await failGovernedExecutionDb({
        organizationId: actor.organizationId,
        idempotencyKey,
        mutated: false,
      });
      throw sendError;
    }
    if (delivery !== "queued") {
      await failGovernedExecutionDb({
        organizationId: actor.organizationId,
        idempotencyKey,
        mutated: false,
      });
      return NextResponse.json(
        {
          ok: false,
          delivery,
          error: error ?? "Email provider did not accept the message.",
        },
        { status: 502 },
      );
    }
    await completeGovernedExecutionDb({
      organizationId: actor.organizationId,
      idempotencyKey,
      verificationStatus: "pending",
      outcome: {
        delivery: "queued",
        recipient,
        customerId: customer.id,
        mutated: true,
      },
    });
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
