/**
 * Approved customer email send.
 * Organization, workspace, and recipient come from the server session and CRM row.
 */

import { NextResponse } from "next/server";
import {
  ambiguousGovernedEmailAttempt,
  appendGovernedEvidenceDb,
  beginGovernedEmailAttempt,
  completeGovernedEmailAttempt,
  failGovernedEmailAttempt,
} from "@/app/lib/agents/governedExecutionDb";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { emailReplayDecision } from "@/features/agents/evidence/governedExecution";
import { authorizeGovernedMutation } from "@/features/agents/evidence/governedAuthorization";
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
      executionId?: string;
      stepId?: string;
      to?: string;
      approvalGranted?: unknown;
    };
    const customerId = body.customerId?.trim() ?? "";
    const subject = body.subject?.trim() ?? "";
    const text = body.text?.trim() ?? "";
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    const executionId = body.executionId?.trim() ?? "";
    const stepId = body.stepId?.trim() ?? "";
    if (!customerId || !subject || !text || !idempotencyKey || !executionId || !stepId) {
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

    const state = await getAgentOsStateForActor(actor);
    const gate = authorizeGovernedMutation({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      capabilityId: "COMMUNICATION_SEND_EMAIL",
      idempotencyKey,
      executionId,
      stepId,
      state,
    });
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, code: "forbidden", message: gate.message, delivery: "not_configured" },
        { status: gate.status },
      );
    }
    void body.approvalGranted;
    const claim = await beginGovernedEmailAttempt({
      organizationId: actor.organizationId,
      idempotencyKey,
      executionId: gate.context.executionId,
      businessGoalId: gate.context.businessGoalId,
      planId: gate.context.planId,
      stepId: gate.context.stepId,
      capabilityId: gate.context.capabilityId,
      workerId: gate.context.workerId,
      actorId: actor.userId,
    });
    if (claim.kind === "replay") {
      const decision = emailReplayDecision({
        outcome: claim.outcome,
        customerId: customer.id,
        recipient,
      });
      if (decision !== "replay") {
        return NextResponse.json(
          {
            ok: false,
            code: "conflict",
            message: "This email execution does not match the customer.",
            delivery: "not_configured",
          },
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
    if (claim.kind === "ambiguous") {
      return NextResponse.json(
        {
          ok: false,
          code: "ambiguous",
          message: "Email delivery is ambiguous. The message was not sent again.",
          delivery: "not_configured",
        },
        { status: 409 },
      );
    }
    if (claim.kind === "in_progress" || claim.kind === "mismatch") {
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
      await ambiguousGovernedEmailAttempt({
        organizationId: actor.organizationId,
        idempotencyKey,
      });
      await appendGovernedEvidenceDb({
        organizationId: actor.organizationId,
        executionId: gate.context.executionId,
        businessGoalId: gate.context.businessGoalId,
        planId: gate.context.planId,
        stepId: gate.context.stepId,
        capabilityId: gate.context.capabilityId,
        workerId: gate.context.workerId,
        actorId: actor.userId,
        action: "execution.result",
        status: "ambiguous",
        metadata: { idempotencyKey },
      });
      throw sendError;
    }
    if (delivery !== "queued") {
      await failGovernedEmailAttempt({
        organizationId: actor.organizationId,
        idempotencyKey,
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
    const recorded = await completeGovernedEmailAttempt({
      organizationId: actor.organizationId,
      idempotencyKey,
      outcome: {
        delivery: "queued",
        recipient,
        customerId: customer.id,
      },
    });
    if (!recorded) {
      return NextResponse.json(
        {
          ok: false,
          code: "ambiguous",
          message: "Email delivery is ambiguous. The message was not sent again.",
          delivery: "not_configured",
        },
        { status: 409 },
      );
    }
    await appendGovernedEvidenceDb({
      organizationId: actor.organizationId,
      executionId: gate.context.executionId,
      businessGoalId: gate.context.businessGoalId,
      planId: gate.context.planId,
      stepId: gate.context.stepId,
      capabilityId: gate.context.capabilityId,
      workerId: gate.context.workerId,
      actorId: actor.userId,
      action: "execution.result",
      status: "queued",
      metadata: { idempotencyKey, customerId: customer.id, approval: "APPROVED" },
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
