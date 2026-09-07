/**
 * Phase 71 — Gmail Business Agent tools.
 * Send is always gated by SAFE/approval + canSendEmail. Never fake success.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  createGmailDraftForActor,
  getGmailAccountForActor,
  getGmailMessageForActor,
  listGmailMessagesForActor,
  sendGmailMessageForActor,
  type GmailClientDeps,
  type GmailDraftResult,
  type GmailMessageDetail,
  type GmailMessageSummary,
  type GmailSendResult,
} from "@/app/lib/gmail/client";
import { recordExternalAction } from "./audit";
import { assertProviderPermission } from "./integrations";
import { getAgentPolicyForActor } from "./policy";
import { redactSecrets } from "./redact";
import type { AgentToolName } from "./tools";

export const GMAIL_CHAT_GUIDANCE =
  "Gmail/Google Workspace uses official OAuth only. Read and draft may run when Gmail is connected and permitted. Sending is disabled by default, blocked until the user enables send permission, blocked by SAFE MODE, and requires explicit approval. Never claim an email was sent unless Gmail confirmed the send. Never include OAuth tokens, refresh tokens, client secrets, or access tokens in replies.";

export type GmailToolName =
  | "gmail.list_messages"
  | "gmail.get_message"
  | "gmail.create_draft"
  | "gmail.send_message";

export type GmailToolArgs = {
  readonly query?: string;
  readonly maxResults?: number;
  readonly messageId?: string;
  readonly to?: string;
  readonly subject?: string;
  readonly body?: string;
  readonly cc?: string;
  readonly inReplyTo?: string;
  readonly draftId?: string;
  readonly campaignItemId?: string;
  readonly approved?: boolean;
};

async function assertGmailRead(actor: Actor): Promise<void> {
  await assertProviderPermission(actor, "email_gmail", "read");
}

async function assertGmailDraft(actor: Actor): Promise<void> {
  await assertProviderPermission(actor, "email_gmail", "create_draft");
}

async function assertGmailSendAllowed(
  actor: Actor,
  input: { readonly approved?: boolean; readonly itemStatus?: string },
): Promise<void> {
  await assertProviderPermission(actor, "email_gmail", "send_email");
  const policy = await getAgentPolicyForActor(actor);
  const approved = input.approved === true || input.itemStatus === "APPROVED";
  if (!approved) {
    await recordExternalAction({
      actor,
      provider: "email_gmail",
      action: "gmail.send_message",
      status: "approval_required",
      error: "approval_required",
    });
    throw new PersistenceError(
      "forbidden",
      "Sending Gmail requires explicit approval",
    );
  }
  if (policy.mode === "SAFE" && !approved) {
    throw new PersistenceError(
      "forbidden",
      "SAFE MODE requires explicit approval before sending email",
    );
  }
}

function publicToolPayload<T>(value: T): T {
  return redactSecrets(value);
}

export async function getConnectedGmailAccountForActor(
  actor: Actor,
  deps: GmailClientDeps = {},
) {
  await assertGmailRead(actor);
  const account = await getGmailAccountForActor(actor, deps);
  return publicToolPayload({
    provider: "email_gmail" as const,
    emailAddress: account.emailAddress,
    messagesTotal: account.messagesTotal,
    threadsTotal: account.threadsTotal,
  });
}

export async function executeGmailToolForActor(
  actor: Actor,
  name: GmailToolName,
  args: GmailToolArgs,
  deps: GmailClientDeps = {},
): Promise<unknown> {
  switch (name) {
    case "gmail.list_messages": {
      await assertGmailRead(actor);
      const messages: readonly GmailMessageSummary[] =
        await listGmailMessagesForActor(
          actor,
          { query: args.query, maxResults: args.maxResults },
          deps,
        );
      await recordExternalAction({
        actor,
        provider: "email_gmail",
        action: name,
        status: "completed",
        metadata: { count: messages.length, query: args.query ?? null },
      });
      return publicToolPayload({ messages });
    }
    case "gmail.get_message": {
      await assertGmailRead(actor);
      if (!args.messageId) {
        throw new PersistenceError("validation", "messageId is required");
      }
      const message: GmailMessageDetail = await getGmailMessageForActor(
        actor,
        args.messageId,
        "full",
        deps,
      );
      await recordExternalAction({
        actor,
        provider: "email_gmail",
        action: name,
        status: "completed",
        target: message.id,
      });
      return publicToolPayload({ message });
    }
    case "gmail.create_draft": {
      await assertGmailDraft(actor);
      const draft: GmailDraftResult = await createGmailDraftForActor(
        actor,
        {
          to: args.to ?? "",
          subject: args.subject ?? "",
          body: args.body ?? "",
          cc: args.cc,
          inReplyTo: args.inReplyTo,
        },
        deps,
      );
      await recordExternalAction({
        actor,
        provider: "email_gmail",
        action: name,
        status: "completed",
        externalId: draft.draftId,
        metadata: { messageId: draft.messageId ?? null },
      });
      return publicToolPayload({ draft, sent: false });
    }
    case "gmail.send_message": {
      await assertGmailSendAllowed(actor, { approved: args.approved });
      let sent: GmailSendResult;
      try {
        sent = await sendGmailMessageForActor(
          actor,
          {
            to: args.to ?? "",
            subject: args.subject ?? "",
            body: args.body ?? "",
            cc: args.cc,
            inReplyTo: args.inReplyTo,
            draftId: args.draftId,
          },
          deps,
        );
      } catch (error) {
        await recordExternalAction({
          actor,
          provider: "email_gmail",
          action: name,
          status: "failed",
          error:
            error instanceof PersistenceError
              ? error.message
              : "gmail_send_failed",
        });
        throw error;
      }
      await recordExternalAction({
        actor,
        provider: "email_gmail",
        action: name,
        status: "completed",
        externalId: sent.id,
        metadata: { threadId: sent.threadId },
      });
      return publicToolPayload({ sent: true, id: sent.id, threadId: sent.threadId });
    }
    default: {
      const _never: never = name;
      throw new PersistenceError("validation", `Unknown Gmail tool: ${_never}`);
    }
  }
}

export function isGmailToolName(name: string): name is GmailToolName {
  return (
    name === "gmail.list_messages" ||
    name === "gmail.get_message" ||
    name === "gmail.create_draft" ||
    name === "gmail.send_message"
  );
}

export function isGmailTool(name: AgentToolName): name is GmailToolName {
  return isGmailToolName(name);
}
