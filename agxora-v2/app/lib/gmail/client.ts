/**
 * Phase 71 — server-only Gmail API client.
 * Access tokens stay in memory for the request. Never returned to callers.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getValidSocialAccessTokenForActor } from "@/app/lib/social/credentials";
import {
  decodeGmailTextBody,
  encodeRfc822Raw,
  headersFromGmailPayload,
} from "./mime";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailAccount = {
  readonly emailAddress: string;
  readonly messagesTotal?: number;
  readonly threadsTotal?: number;
};

export type GmailMessageSummary = {
  readonly id: string;
  readonly threadId: string;
  readonly snippet: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly date: string;
  readonly labelIds: readonly string[];
};

export type GmailMessageDetail = GmailMessageSummary & {
  readonly body: string;
};

export type GmailDraftResult = {
  readonly draftId: string;
  readonly messageId?: string;
};

export type GmailSendResult = {
  readonly id: string;
  readonly threadId: string;
  readonly labelIds: readonly string[];
};

export type GmailClientDeps = {
  readonly fetchImpl?: typeof fetch;
  readonly getAccessToken?: (actor: Actor) => Promise<string | null>;
};

function gmailApiError(
  status: number,
  code: string,
): PersistenceError {
  if (status === 401 || status === 403) {
    return new PersistenceError(
      "forbidden",
      "Gmail credentials expired or revoked",
      {
        status: 401,
        details: [{ field: "gmail", message: "token_expired_or_revoked" }],
      },
    );
  }
  return new PersistenceError("validation", "Gmail API request failed", {
    status: 502,
    details: [{ field: "gmail", message: code }],
  });
}

async function requireAccessToken(
  actor: Actor,
  deps: GmailClientDeps,
): Promise<string> {
  const token = deps.getAccessToken
    ? await deps.getAccessToken(actor)
    : await getValidSocialAccessTokenForActor(actor, "gmail");
  if (!token) {
    throw new PersistenceError(
      "forbidden",
      "Gmail is not connected or credentials were revoked",
      {
        status: 401,
        details: [{ field: "gmail", message: "not_connected_or_revoked" }],
      },
    );
  }
  return token;
}

async function gmailRequest<T>(
  actor: Actor,
  path: string,
  init: RequestInit,
  deps: GmailClientDeps,
): Promise<T> {
  const token = await requireAccessToken(actor, deps);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetchImpl(`${GMAIL_API}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw gmailApiError(response.status, `http_${response.status}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export async function getGmailAccountForActor(
  actor: Actor,
  deps: GmailClientDeps = {},
): Promise<GmailAccount> {
  const profile = await gmailRequest<{
    emailAddress?: string;
    messagesTotal?: number;
    threadsTotal?: number;
  }>(actor, "/profile", { method: "GET" }, deps);
  if (!profile.emailAddress) {
    throw new PersistenceError("validation", "Gmail did not return an account", {
      status: 502,
      details: [{ field: "gmail", message: "missing_profile" }],
    });
  }
  return {
    emailAddress: profile.emailAddress,
    messagesTotal: profile.messagesTotal,
    threadsTotal: profile.threadsTotal,
  };
}

export async function listGmailMessagesForActor(
  actor: Actor,
  input: { readonly query?: string; readonly maxResults?: number } = {},
  deps: GmailClientDeps = {},
): Promise<readonly GmailMessageSummary[]> {
  const params = new URLSearchParams();
  if (input.query?.trim()) params.set("q", input.query.trim());
  const max = Math.min(Math.max(input.maxResults ?? 20, 1), 50);
  params.set("maxResults", String(max));
  const listed = await gmailRequest<{
    messages?: readonly { id?: string; threadId?: string }[];
  }>(actor, `/messages?${params.toString()}`, { method: "GET" }, deps);

  const summaries: GmailMessageSummary[] = [];
  for (const item of listed.messages ?? []) {
    if (!item.id) continue;
    summaries.push(await getGmailMessageForActor(actor, item.id, "metadata", deps));
  }
  return summaries;
}

export async function getGmailMessageForActor(
  actor: Actor,
  messageId: string,
  format: "full" | "metadata" = "full",
  deps: GmailClientDeps = {},
): Promise<GmailMessageDetail> {
  const id = messageId.trim();
  if (!id) {
    throw new PersistenceError("validation", "message id is required");
  }
  const metadataHeaders = "format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date";
  const path =
    format === "metadata"
      ? `/messages/${encodeURIComponent(id)}?${metadataHeaders}`
      : `/messages/${encodeURIComponent(id)}?format=full`;
  const payload = await gmailRequest<{
    id?: string;
    threadId?: string;
    snippet?: string;
    labelIds?: string[];
    payload?: {
      headers?: { name?: string; value?: string }[];
      mimeType?: string;
      body?: { data?: string };
      parts?: unknown[];
    };
  }>(actor, path, { method: "GET" }, deps);
  if (!payload.id) {
    throw new PersistenceError("validation", "Gmail did not return the message", {
      status: 502,
      details: [{ field: "gmail", message: "missing_message" }],
    });
  }
  const headers = headersFromGmailPayload(payload.payload?.headers);
  return {
    id: payload.id,
    threadId: payload.threadId ?? "",
    snippet: payload.snippet ?? "",
    from: headers.from,
    to: headers.to,
    subject: headers.subject,
    date: headers.date,
    labelIds: payload.labelIds ?? [],
    body: format === "full" ? decodeGmailTextBody(payload.payload) : "",
  };
}

export async function createGmailDraftForActor(
  actor: Actor,
  input: {
    readonly to: string;
    readonly subject: string;
    readonly body: string;
    readonly cc?: string;
    readonly inReplyTo?: string;
  },
  deps: GmailClientDeps = {},
): Promise<GmailDraftResult> {
  if (!input.to.trim() || !input.subject.trim()) {
    throw new PersistenceError("validation", "to and subject are required");
  }
  const raw = encodeRfc822Raw(input);
  const created = await gmailRequest<{
    id?: string;
    message?: { id?: string };
  }>(
    actor,
    "/drafts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw } }),
    },
    deps,
  );
  if (!created.id) {
    throw new PersistenceError("validation", "Gmail did not create a draft", {
      status: 502,
      details: [{ field: "gmail", message: "draft_not_confirmed" }],
    });
  }
  return { draftId: created.id, messageId: created.message?.id };
}

export async function sendGmailMessageForActor(
  actor: Actor,
  input: {
    readonly to: string;
    readonly subject: string;
    readonly body: string;
    readonly cc?: string;
    readonly inReplyTo?: string;
    readonly draftId?: string;
  },
  deps: GmailClientDeps = {},
): Promise<GmailSendResult> {
  if (!input.draftId && (!input.to.trim() || !input.subject.trim())) {
    throw new PersistenceError("validation", "to and subject are required");
  }

  const sent = input.draftId
    ? await gmailRequest<{
        id?: string;
        threadId?: string;
        labelIds?: string[];
      }>(
        actor,
        "/drafts/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: input.draftId }),
        },
        deps,
      )
    : await gmailRequest<{
        id?: string;
        threadId?: string;
        labelIds?: string[];
      }>(
        actor,
        "/messages/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encodeRfc822Raw(input) }),
        },
        deps,
      );

  if (!sent.id) {
    throw new PersistenceError(
      "validation",
      "Gmail did not confirm the send",
      {
        status: 502,
        details: [{ field: "gmail", message: "send_not_confirmed" }],
      },
    );
  }
  return {
    id: sent.id,
    threadId: sent.threadId ?? "",
    labelIds: sent.labelIds ?? [],
  };
}
