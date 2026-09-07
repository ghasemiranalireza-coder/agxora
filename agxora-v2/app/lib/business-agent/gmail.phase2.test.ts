import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSocialSecret, decryptSocialSecret } from "@/app/lib/social/crypto";
import {
  consumeSocialOAuthState,
  issueSocialOAuthState,
  setSocialOAuthStateStoreForTests,
} from "@/app/lib/social/oauth/state";
import {
  getValidSocialAccessTokenForActor,
  hasActiveSocialCredential,
  setSocialCredentialStoreForTests,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { redactSecrets } from "./redact";

const policyState = vi.hoisted(() => ({
  mode: "SAFE" as "SAFE" | "ASSISTED" | "AUTONOMOUS",
  flags: {
    canRead: true,
    canCreateDraft: true,
    canSchedule: false,
    canPublish: false,
    canSendEmail: false,
    canDelete: false,
  },
}));

vi.mock("./policy", () => ({
  getAgentPolicyForActor: vi.fn(async () => ({
    organizationId: "org-a",
    workspaceId: "ws-a",
    mode: policyState.mode,
    updatedAt: null,
  })),
}));

vi.mock("./integrations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./integrations")>();
  return {
    ...actual,
    markIntegrationConnectedForActor: vi.fn(async () => {}),
    getPermissionFlagsForActor: vi.fn(async () => policyState.flags),
    assertProviderPermission: vi.fn(async (_actor, _provider, permission) => {
      const granted =
        permission === "read"
          ? policyState.flags.canRead
          : permission === "create_draft"
            ? policyState.flags.canCreateDraft
            : permission === "send_email"
              ? policyState.flags.canSendEmail
              : false;
      if (!granted) {
        throw new PersistenceError(
          "forbidden",
          `Permission ${permission} is not granted for email_gmail`,
        );
      }
    }),
  };
});

vi.mock("./audit", () => ({
  recordExternalAction: vi.fn(async () => {}),
}));

import {
  beginGmailOAuthForActor,
  completeGmailOAuthForActor,
} from "@/app/lib/social/oauth/gmail";
import {
  createGmailDraftForActor,
  listGmailMessagesForActor,
  sendGmailMessageForActor,
} from "@/app/lib/gmail/client";
import { executeGmailToolForActor } from "./gmail-tools";
import { GET as gmailCallback } from "@/app/api/v1/integrations/email_gmail/callback/route";
import { POST as gmailConnect } from "@/app/api/v1/integrations/[provider]/connect/route";

const actorA: Actor = {
  userId: "user-a",
  email: "owner-a@agxora.dev",
  name: "Owner A",
  organizationId: "org-a",
  workspaceId: "ws-a",
  membershipId: "mem-a",
  role: "OWNER",
  sessionToken: "session-a",
};

const actorB: Actor = {
  ...actorA,
  userId: "user-b",
  email: "owner-b@agxora.dev",
  organizationId: "org-b",
  workspaceId: "ws-b",
  membershipId: "mem-b",
  sessionToken: "session-b",
};

const actorRef = vi.hoisted(() => ({ current: null as Actor | null }));

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => {
      if (!actorRef.current) {
        throw new actual.PersistenceError("unauthorized", "Authentication required");
      }
      return actorRef.current;
    }),
  };
});

vi.mock("@/app/lib/auth/server/http", () => ({
  requireDatabase: vi.fn(() => undefined),
}));

vi.mock("@/app/lib/security/rate-limit", () => ({
  rateLimitResponse: vi.fn(async () => null),
}));

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toMatch(/ya29\./);
  expect(serialized).not.toContain("refresh-secret");
  expect(serialized).not.toContain("access-secret");
  expect(serialized).not.toContain("gmail-client-secret");
  expect(serialized).not.toContain("AGXORA_GMAIL_OAUTH_CLIENT_SECRET");
  expect(serialized).not.toMatch(/sk-[a-zA-Z0-9]/);
}

function gmailEnv() {
  process.env.AGXORA_GMAIL_OAUTH_CLIENT_ID = "gmail-client-id";
  process.env.AGXORA_GMAIL_OAUTH_CLIENT_SECRET = "gmail-client-secret";
  process.env.AGXORA_GMAIL_OAUTH_REDIRECT_URI =
    "http://localhost:3000/api/v1/integrations/email_gmail/callback";
  process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
}

describe("Phase 2 Gmail OAuth and API", () => {
  beforeEach(() => {
    setSocialOAuthStateStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    policyState.mode = "SAFE";
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: false,
      canDelete: false,
    };
    actorRef.current = actorA;
    gmailEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setSocialOAuthStateStoreForTests(null);
    setSocialCredentialStoreForTests(null);
  });

  it("validates OAuth state, CSRF, and organization binding", async () => {
    const issued = await issueSocialOAuthState({
      actor: actorA,
      platform: "gmail",
      codeVerifier: "verifier-a",
    });
    await expect(
      consumeSocialOAuthState({ actor: actorB, platform: "gmail", state: issued.state }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      consumeSocialOAuthState({ actor: actorA, platform: "youtube", state: issued.state }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      consumeSocialOAuthState({ actor: actorA, platform: "gmail", state: "not-the-state" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    const consumed = await consumeSocialOAuthState({
      actor: actorA,
      platform: "gmail",
      state: issued.state,
    });
    expect(consumed.codeVerifier).toBe("verifier-a");
    await expect(
      consumeSocialOAuthState({ actor: actorA, platform: "gmail", state: issued.state }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("starts official Google OAuth without exposing the client secret", async () => {
    const result = await beginGmailOAuthForActor(actorA, "/dashboard/email");
    expect(result.authorizationUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(result.authorizationUrl).toContain("gmail.readonly");
    expect(result.authorizationUrl).toContain("gmail.compose");
    expect(result.authorizationUrl).toContain("gmail.send");
    expect(result.authorizationUrl).not.toContain("gmail-client-secret");
    assertNoSecretLeak(result);
  });

  it("completes OAuth callback, encrypts tokens, and never returns them", async () => {
    const begin = await beginGmailOAuthForActor(actorA);
    const url = new URL(begin.authorizationUrl);
    const state = url.searchParams.get("state");
    expect(state).toBeTruthy();

    const fetchImpl: typeof fetch = async (input, init) => {
      const href = String(input);
      if (href.includes("oauth2.googleapis.com/token")) {
        const body =
          typeof init?.body === "string"
            ? init.body
            : init?.body instanceof URLSearchParams
              ? init.body.toString()
              : String(init?.body ?? "");
        expect(body).toContain("code_verifier");
        expect(body).toContain("gmail-client-secret");
        return new Response(
          JSON.stringify({
            access_token: "ya29.access-secret",
            refresh_token: "refresh-secret",
            expires_in: 3600,
            token_type: "Bearer",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (href.includes("/gmail/v1/users/me/profile")) {
        return new Response(JSON.stringify({ emailAddress: "inbox@example.com" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    };

    const completed = await completeGmailOAuthForActor(
      actorA,
      { code: "auth-code", state: state! },
      fetchImpl,
    );
    expect(completed.connected).toBe(true);
    expect(completed.emailAddress).toBe("inbox@example.com");
    assertNoSecretLeak(completed);
    expect(await hasActiveSocialCredential(actorA.organizationId, "gmail")).toBe(true);
    expect(await hasActiveSocialCredential(actorB.organizationId, "gmail")).toBe(false);
    const token = await getValidSocialAccessTokenForActor(actorA, "gmail");
    expect(token).toBe("ya29.access-secret");
    expect(await getValidSocialAccessTokenForActor(actorB, "gmail")).toBeNull();
  });

  it("encrypts stored credentials with the existing social crypto", () => {
    const cipher = encryptSocialSecret(
      JSON.stringify({ accessToken: "ya29.access-secret", refreshToken: "refresh-secret" }),
    );
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher).not.toContain("ya29.access-secret");
    expect(cipher).not.toContain("refresh-secret");
    const plain = JSON.parse(decryptSocialSecret(cipher)) as {
      accessToken: string;
    };
    expect(plain.accessToken).toBe("ya29.access-secret");
  });

  it("redacts tokens from audit-shaped payloads", () => {
    const redacted = redactSecrets({
      access_token: "ya29.access-secret",
      refresh_token: "refresh-secret",
      client_secret: "gmail-client-secret",
      ok: true,
    });
    expect(redacted.access_token).toBe("[redacted]");
    expect(redacted.refresh_token).toBe("[redacted]");
    expect(redacted.client_secret).toBe("[redacted]");
    expect(redacted.ok).toBe(true);
  });

  it("rejects unauthenticated connect", async () => {
    actorRef.current = null;
    const response = await gmailConnect(
      new Request("http://localhost/api/v1/integrations/email_gmail/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ provider: "email_gmail" }) },
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    assertNoSecretLeak(body);
  });

  it("handles OAuth denial without marking connected", async () => {
    const response = await gmailCallback(
      new Request(
        "http://localhost/api/v1/integrations/email_gmail/callback?error=access_denied&state=abc",
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("gmail=denied");
  });

  it("stores Gmail connection against the authenticated actor organization only", async () => {
    await upsertSocialCredentialForActor(actorA, "gmail", {
      tokens: { accessToken: "ya29.access-secret", refreshToken: "refresh-secret" },
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      externalAccountName: "inbox@example.com",
    });
    expect(await hasActiveSocialCredential(actorA.organizationId, "gmail")).toBe(true);
    expect(await hasActiveSocialCredential(actorB.organizationId, "gmail")).toBe(false);
  });

  it("lists messages through the official Gmail API and never returns tokens", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const href = String(input);
      expect(href).toContain("gmail.googleapis.com");
      if (href.includes("/messages?") && !href.includes("/messages/m1")) {
        return new Response(JSON.stringify({ messages: [{ id: "m1", threadId: "t1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          id: "m1",
          threadId: "t1",
          snippet: "Need a reply",
          labelIds: ["INBOX"],
          payload: {
            headers: [
              { name: "From", value: "customer@example.com" },
              { name: "Subject", value: "Quote" },
              { name: "Date", value: "Tue, 1 Sep 2026 10:00:00 +0000" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const messages = await listGmailMessagesForActor(
      actorA,
      { query: "newer_than:1d" },
      { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]?.subject).toBe("Quote");
    assertNoSecretLeak(messages);
  });

  it("blocks send under SAFE defaults and missing approval", async () => {
    await expect(
      executeGmailToolForActor(
        actorA,
        "gmail.send_message",
        { to: "a@b.com", subject: "Hi", body: "Hello", approved: false },
        { getAccessToken: async () => "ya29.access-secret", fetchImpl: async () => new Response("no") },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("blocks send when canSendEmail is false even if approved", async () => {
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: false,
      canDelete: false,
    };
    await expect(
      executeGmailToolForActor(
        actorA,
        "gmail.send_message",
        { to: "a@b.com", subject: "Hi", body: "Hello", approved: true },
        { getAccessToken: async () => "ya29.access-secret", fetchImpl: async () => new Response("no") },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("creates a draft without sending", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toContain("/drafts");
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ id: "draft-1", message: { id: "msg-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const draft = await createGmailDraftForActor(
      actorA,
      { to: "a@b.com", subject: "Hi", body: "Hello" },
      { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    );
    expect(draft.draftId).toBe("draft-1");
    const tool = await executeGmailToolForActor(
      actorA,
      "gmail.create_draft",
      { to: "a@b.com", subject: "Hi", body: "Hello" },
      { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    );
    expect(tool).toMatchObject({ sent: false, draft: { draftId: "draft-1" } });
    assertNoSecretLeak(tool);
  });

  it("reports send success only after Gmail confirms an id", async () => {
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: true,
      canDelete: false,
    };
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ id: "sent-1", threadId: "th-1", labelIds: ["SENT"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const result = await executeGmailToolForActor(
      actorA,
      "gmail.send_message",
      { to: "a@b.com", subject: "Hi", body: "Hello", approved: true },
      { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    );
    expect(result).toMatchObject({ sent: true, id: "sent-1" });
    assertNoSecretLeak(result);
  });

  it("does not fake success when Gmail omits a send id", async () => {
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: true,
      canDelete: false,
    };
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ threadId: "th-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    await expect(
      executeGmailToolForActor(
        actorA,
        "gmail.send_message",
        { to: "a@b.com", subject: "Hi", body: "Hello", approved: true },
        { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("fails honestly on Gmail API errors", async () => {
    const fetchImpl: typeof fetch = async () => new Response("boom", { status: 500 });
    await expect(
      sendGmailMessageForActor(
        actorA,
        { to: "a@b.com", subject: "Hi", body: "Hello" },
        { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
      ),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("treats missing/expired tokens as revoked rather than success", async () => {
    await expect(
      listGmailMessagesForActor(actorA, {}, { getAccessToken: async () => null }),
    ).rejects.toMatchObject({
      status: 401,
    });
    const fetchImpl: typeof fetch = async () => new Response("denied", { status: 401 });
    await expect(
      listGmailMessagesForActor(
        actorA,
        {},
        { fetchImpl, getAccessToken: async () => "ya29.expired" },
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("does not leak Google secrets from callback JSON errors", async () => {
    const response = await gmailCallback(
      new Request("http://localhost/api/v1/integrations/email_gmail/callback"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    assertNoSecretLeak(body);
  });
});
