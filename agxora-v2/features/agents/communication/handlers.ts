/**
 * Customer email steps for a business-goal plan.
 * Load and prepare are read-only. Send goes through the server email route.
 */

import { getCrmBridgeProvider } from "../crm";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import {
  firstCustomerCrmCustomerResolveErrorMessage,
  resolveFirstCustomerCrmCustomerId,
} from "@/app/lib/workspace/firstCustomerAgentCrm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MISSING_RECIPIENT = "A valid customer email address is required.";

export type CustomerEmailSendInput = {
  readonly customerId: string;
  readonly subject: string;
  readonly text: string;
  readonly idempotencyKey: string;
};

export type CustomerEmailSendResult = {
  readonly ok: boolean;
  readonly delivery: "queued" | "not_configured";
  readonly recipient?: string;
  readonly error?: string;
};

type CustomerEmailSender = (
  input: CustomerEmailSendInput,
) => Promise<CustomerEmailSendResult>;

async function httpSender(
  input: CustomerEmailSendInput,
): Promise<CustomerEmailSendResult> {
  const response = await fetch("/api/v1/agents/customer-email", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as {
    delivery?: string;
    recipient?: string;
    error?: string;
    message?: string;
  } | null;
  if (response.ok && payload?.delivery === "queued" && payload.recipient) {
    return { ok: true, delivery: "queued", recipient: payload.recipient };
  }
  return {
    ok: false,
    delivery: "not_configured",
    error: payload?.error ?? payload?.message ?? "Email provider did not accept the message.",
  };
}

let sender: CustomerEmailSender = httpSender;

export function setCustomerEmailSenderForTests(
  next: CustomerEmailSender | null,
): void {
  sender = next ?? httpSender;
}

function readString(
  params: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function resolveCustomer(ctx: ToolInvocationContext) {
  const provider = getCrmBridgeProvider();
  if (!provider.available) {
    return { ok: false as const, error: "CRM is unavailable." };
  }
  const listed = await provider.listCustomers(ctx.organizationId);
  const resolved = resolveFirstCustomerCrmCustomerId({
    requestedId: readString(ctx.params, "customerId"),
    goal: readString(ctx.params, "goal"),
    customerIds: listed.map((customer) => customer.id),
  });
  if (!resolved.ok) {
    return {
      ok: false as const,
      error: firstCustomerCrmCustomerResolveErrorMessage(resolved.error),
    };
  }
  const customer = await provider.getCustomer(resolved.id);
  if (!customer || customer.organizationId !== ctx.organizationId) {
    return { ok: false as const, error: "Customer not found" };
  }
  return { ok: true as const, customer };
}

function draftFor(
  customer: { id: string; companyName: string; email: string },
  goal: string,
  contextText?: string,
) {
  const company = customer.companyName.trim() || "this customer";
  return {
    to: customer.email.trim(),
    subject: `Reply to ${company}`,
    body: [
      `Hello ${company},`,
      "",
      goal,
      "",
      "This message was prepared by AGXORA and is sent only after approval.",
    ].join("\n"),
    ...(contextText ? { context: contextText } : {}),
    customerId: customer.id,
    companyName: company,
  };
}

export async function handleCommunicationTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "action") ?? "";
  const resolved = await resolveCustomer(ctx);
  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.error,
      output: { action, mutated: false, sent: false },
      durationMs: Date.now() - started,
    };
  }
  const customer = resolved.customer;
  const goal = readString(ctx.params, "goal") ?? "";

  if (action === "load_customer_context") {
    return {
      ok: true,
      output: {
        action,
        readOnly: true,
        mutated: false,
        sent: false,
        customer: {
          id: customer.id,
          companyName: customer.companyName,
          contactName: customer.contactName,
          email: customer.email,
        },
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "prepare_customer_email") {
    const email = customer.email.trim();
    if (!EMAIL_RE.test(email)) {
      return {
        ok: false,
        error: MISSING_RECIPIENT,
        output: { action, mutated: false, sent: false, customerId: customer.id },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        readOnly: true,
        mutated: false,
        sent: false,
        draft: draftFor(customer, goal, readString(ctx.params, "plannerContextText")),
        customer: {
          id: customer.id,
          companyName: customer.companyName,
          email,
        },
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "send_customer_email") {
    const draftTo = readString(ctx.params, "to");
    const subject = readString(ctx.params, "subject");
    const text = readString(ctx.params, "body");
    const idempotencyKey = readString(ctx.params, "idempotencyKey");
    const email = customer.email.trim();
    if (!EMAIL_RE.test(email)) {
      return {
        ok: false,
        error: MISSING_RECIPIENT,
        output: { action, mutated: false, sent: false },
        durationMs: Date.now() - started,
      };
    }
    if (draftTo && draftTo.toLowerCase() !== email.toLowerCase()) {
      return {
        ok: false,
        error: "Recipient does not match the customer email.",
        output: { action, mutated: false, sent: false },
        durationMs: Date.now() - started,
      };
    }
    if (!subject || !text || !idempotencyKey) {
      return {
        ok: false,
        error: "Email draft is incomplete.",
        output: { action, mutated: false, sent: false },
        durationMs: Date.now() - started,
      };
    }
    const sent = await sender({
      customerId: customer.id,
      subject,
      text,
      idempotencyKey,
    });
    if (!sent.ok || sent.delivery !== "queued" || sent.recipient?.toLowerCase() !== email.toLowerCase()) {
      return {
        ok: false,
        error: sent.error ?? "Email provider did not accept the message.",
        output: {
          action,
          mutated: false,
          sent: false,
          delivery: "not_configured",
          customerId: customer.id,
        },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        mutated: true,
        sent: true,
        delivery: "queued",
        recipient: sent.recipient,
        customerId: customer.id,
        idempotencyKey,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "verify_customer_email") {
    const delivery = readString(ctx.params, "delivery");
    const recipient = readString(ctx.params, "recipient");
    const email = customer.email.trim().toLowerCase();
    const accepted = delivery === "queued" && recipient?.toLowerCase() === email;
    if (!accepted) {
      return {
        ok: false,
        error: "Email acceptance was not verified.",
        output: { action, verified: false, mutated: false, delivery: delivery ?? "not_configured" },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        verified: true,
        mutated: false,
        delivery: "queued",
        recipient,
        customerId: customer.id,
      },
      durationMs: Date.now() - started,
    };
  }

  return {
    ok: false,
    error: "Unsupported email action",
    output: { action, mutated: false, sent: false },
    durationMs: Date.now() - started,
  };
}
