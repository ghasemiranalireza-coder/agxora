import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getProviderDefinition } from "./registry";
import { resolveProviderState } from "./resolver";
import { CANONICAL_PROVIDER_IDS } from "./ids";
import { adapterContextFromActor } from "./adapter-context";
import { UnimplementedProviderAdapter } from "./adapter";

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

const connectionState = vi.hoisted(() => ({
  gmailOrgA: true,
  youtubeOrgA: true,
}));

vi.mock("@/app/lib/business-agent/policy", () => ({
  getAgentPolicyForActor: vi.fn(async () => ({
    organizationId: "org-a",
    workspaceId: "ws-a",
    mode: policyState.mode,
    updatedAt: null,
  })),
}));

vi.mock("@/app/lib/business-agent/integrations", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/lib/business-agent/integrations")>();
  return {
    ...actual,
    getPermissionFlagsForActor: vi.fn(async () => policyState.flags),
    assertProviderPermission: vi.fn(async (_actor, provider, permission) => {
      const granted =
        permission === "read"
          ? policyState.flags.canRead
          : permission === "create_draft"
            ? policyState.flags.canCreateDraft
            : permission === "send_email"
              ? policyState.flags.canSendEmail
              : permission === "publish"
                ? policyState.flags.canPublish
                : false;
      if (!granted) {
        throw new PersistenceError(
          "forbidden",
          `Permission ${permission} is not granted for ${provider}`,
        );
      }
    }),
  };
});

vi.mock("@/app/lib/business-agent/audit", () => ({
  recordExternalAction: vi.fn(async () => {}),
}));

vi.mock("./resolve-for-actor", () => ({
  resolveCanonicalProvidersForActor: vi.fn(async (actor: Actor) => {
    const gmailCred = actor.organizationId === "org-a" && connectionState.gmailOrgA;
    const youtubeCred =
      actor.organizationId === "org-a" && connectionState.youtubeOrgA;
    return [
      resolveProviderState({
        provider: getProviderDefinition("gmail"),
        connection: gmailCred
          ? {
              status: "connected",
              lastError: null,
              permissions: policyState.flags,
              accountLabel: "inbox@org-a.test",
              externalAccountId: "gmail-a",
              connectedAt: "2026-09-01T00:00:00.000Z",
            }
          : null,
        credentialAvailable: gmailCred,
        localStorageConnected: true,
      }),
      resolveProviderState({
        provider: getProviderDefinition("youtube"),
        connection: youtubeCred
          ? {
              status: "connected",
              lastError: null,
              permissions: policyState.flags,
              accountLabel: "Org A Channel",
              externalAccountId: "yt-a",
              connectedAt: "2026-09-01T00:00:00.000Z",
            }
          : null,
        credentialAvailable: youtubeCred,
        localStorageConnected: true,
      }),
      resolveProviderState({
        provider: getProviderDefinition("linkedin"),
        connection: null,
        credentialAvailable: false,
        localStorageConnected: true,
      }),
    ];
  }),
}));

vi.mock("@/app/lib/social/oauth/gmail", () => ({
  beginGmailOAuthForActor: vi.fn(async () => ({
    authorizationUrl:
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=gmail-client-id",
  })),
  disconnectGmailForActor: vi.fn(async () => {}),
}));

vi.mock("@/app/lib/social/oauth/youtube", () => ({
  beginYouTubeOAuthForActor: vi.fn(async () => ({
    authorizationUrl:
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=youtube-client-id",
  })),
  disconnectYouTubeForActor: vi.fn(async () => {}),
}));

vi.mock("@/app/lib/social/adapters/registry", () => ({
  getSocialProviderAdapter: vi.fn(() => ({
    providerId: "youtube",
    getCapabilities: () => ({ publishVideo: true }),
    listAccounts: async () => ({
      kind: "ok",
      accounts: [{ externalAccountId: "yt-a", externalAccountName: "Org A Channel" }],
    }),
    publishVideo: async () => ({
      kind: "ok",
      externalId: "yt-confirmed-1",
    }),
  })),
}));

import {
  GmailProviderAdapter,
  YouTubeProviderAdapter,
  executeProviderCapabilityForActor,
  getProviderAdapter,
  gmailAdapter,
  youtubeAdapter,
} from "./adapters";
import { recordExternalAction } from "@/app/lib/business-agent/audit";

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

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toMatch(/ya29\./);
  expect(serialized).not.toContain("refresh-secret");
  expect(serialized).not.toContain("access-secret");
  expect(serialized).not.toContain("gmail-client-secret");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toMatch(/sk-[a-zA-Z0-9]/);
}

describe("provider adapter factory", () => {
  it("resolves unique Gmail and YouTube adapters", () => {
    expect(getProviderAdapter("gmail")).toBe(gmailAdapter);
    expect(getProviderAdapter("youtube")).toBe(youtubeAdapter);
    expect(getProviderAdapter("gmail")).toBeInstanceOf(GmailProviderAdapter);
    expect(getProviderAdapter("youtube")).toBeInstanceOf(YouTubeProviderAdapter);
    expect(getProviderAdapter("gmail")).not.toBe(getProviderAdapter("youtube"));
  });

  it("maps every canonical provider to exactly one adapter identity", () => {
    const seen = new Map<string, string>();
    for (const providerId of CANONICAL_PROVIDER_IDS) {
      const adapter = getProviderAdapter(providerId);
      expect(adapter.providerId).toBe(providerId);
      expect(seen.has(providerId)).toBe(false);
      seen.set(providerId, adapter.constructor.name);
    }
    expect(seen.size).toBe(CANONICAL_PROVIDER_IDS.length);
  });

  it("returns truthful not_implemented for unknown, coming-soon, and unsupported providers", async () => {
    const unknown = await executeProviderCapabilityForActor(
      actorA,
      "not-a-real-provider",
      "publish",
      {},
    );
    expect(unknown).toMatchObject({ ok: false, code: "not_implemented" });

    for (const providerId of ["linkedin", "amazon_seller", "shopify", "instagram"] as const) {
      const adapter = getProviderAdapter(providerId);
      expect(adapter).toBeInstanceOf(UnimplementedProviderAdapter);
      const executed = await adapter.execute(
        "publish",
        {},
        adapterContextFromActor(actorA),
      );
      expect(executed.ok).toBe(false);
      expect(executed.code).toBe("not_implemented");
      const connected = await adapter.connect(adapterContextFromActor(actorA));
      expect(connected.connected).toBe(false);
      expect(connected.code).toBe("not_implemented");
    }
  });
});

describe("adapter connection authority", () => {
  beforeEach(() => {
    connectionState.gmailOrgA = true;
    connectionState.youtubeOrgA = true;
    policyState.mode = "SAFE";
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: false,
      canDelete: false,
    };
  });

  it("resolves Gmail connection from the authoritative actor, not localStorage", async () => {
    const connection = await gmailAdapter.getConnection(adapterContextFromActor(actorA));
    expect(connection.providerId).toBe("gmail");
    expect(connection.connected).toBe(true);
    expect(connection.accountLabel).toBe("inbox@org-a.test");
  });

  it("resolves YouTube connection from the authoritative actor", async () => {
    const connection = await youtubeAdapter.getConnection(adapterContextFromActor(actorA));
    expect(connection.providerId).toBe("youtube");
    expect(connection.connected).toBe(true);
  });

  it("isolates Gmail and YouTube credentials by organization", async () => {
    const gmailA = await gmailAdapter.getConnection(adapterContextFromActor(actorA));
    const gmailB = await gmailAdapter.getConnection(adapterContextFromActor(actorB));
    const youtubeA = await youtubeAdapter.getConnection(adapterContextFromActor(actorA));
    const youtubeB = await youtubeAdapter.getConnection(adapterContextFromActor(actorB));
    expect(gmailA.connected).toBe(true);
    expect(gmailB.connected).toBe(false);
    expect(youtubeA.connected).toBe(true);
    expect(youtubeB.connected).toBe(false);
  });

  it("rejects mismatched actor context ids", async () => {
    const result = await gmailAdapter.execute("read", {}, {
      organizationId: "org-a",
      workspaceId: "ws-a",
      userId: "user-a",
      actor: actorB,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("permission_denied");
  });

  it("does not report healthy from a connection row without usable credentials", async () => {
    connectionState.gmailOrgA = false;
    const health = await gmailAdapter.health(adapterContextFromActor(actorA));
    expect(health.ok).toBe(false);
    expect(health.code).not.toBe("ok");
  });

  it("reports Gmail healthy only when credentials are actually usable", async () => {
    const health = await gmailAdapter.health(adapterContextFromActor(actorA));
    expect(health.ok).toBe(true);
    expect(health.code).toBe("ok");
  });
});

describe("Gmail adapter execution", () => {
  beforeEach(() => {
    policyState.mode = "SAFE";
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: false,
      canDelete: false,
    };
    vi.mocked(recordExternalAction).mockClear();
  });

  it("lists messages through the existing Gmail client", async () => {
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
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "read", {
      operation: "gmail.list_messages",
      query: "newer_than:1d",
      deps: { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("ok");
    expect(result.output).toMatchObject({ messages: [{ id: "m1", subject: "Quote" }] });
    assertNoSecretLeak(result);
  });

  it("reads a message through the existing Gmail client", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: "m2",
          threadId: "t2",
          snippet: "Hello",
          labelIds: ["INBOX"],
          payload: {
            headers: [
              { name: "From", value: "a@b.com" },
              { name: "Subject", value: "Hi" },
              { name: "Date", value: "Tue, 1 Sep 2026 10:00:00 +0000" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "read", {
      operation: "gmail.get_message",
      messageId: "m2",
      deps: { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ message: { id: "m2" } });
    assertNoSecretLeak(result);
  });

  it("creates a draft through the adapter without sending", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toContain("/drafts");
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ id: "draft-1", message: { id: "msg-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "create", {
      operation: "gmail.create_draft",
      to: "a@b.com",
      subject: "Hi",
      body: "Hello",
      deps: { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ sent: false, draft: { draftId: "draft-1" } });
    assertNoSecretLeak(result);
  });

  it("blocks Gmail send under SAFE defaults because send permission is off", async () => {
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "send", {
      operation: "gmail.send_message",
      to: "a@b.com",
      subject: "Hi",
      body: "Hello",
      approved: false,
      deps: {
        getAccessToken: async () => "ya29.access-secret",
        fetchImpl: async () => new Response("no"),
      },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("permission_denied");
  });

  it("requires explicit approval before Gmail send even when send is granted", async () => {
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: true,
      canDelete: false,
    };
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "send", {
      operation: "gmail.send_message",
      to: "a@b.com",
      subject: "Hi",
      body: "Hello",
      approved: false,
      deps: {
        getAccessToken: async () => "ya29.access-secret",
        fetchImpl: async () => new Response("no"),
      },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("approval_required");
  });

  it("blocks Gmail send when workspace send permission is off", async () => {
    policyState.flags = {
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: false,
      canDelete: false,
    };
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "send", {
      operation: "gmail.send_message",
      to: "a@b.com",
      subject: "Hi",
      body: "Hello",
      approved: true,
      deps: {
        getAccessToken: async () => "ya29.access-secret",
        fetchImpl: async () => new Response("no"),
      },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("permission_denied");
  });

  it("sends only after approval, permission, and a Gmail-confirmed id", async () => {
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
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "send", {
      operation: "gmail.send_message",
      to: "a@b.com",
      subject: "Hi",
      body: "Hello",
      approved: true,
      deps: { fetchImpl, getAccessToken: async () => "ya29.access-secret" },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ sent: true, id: "sent-1" });
    assertNoSecretLeak(result);
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "email_gmail",
        action: "gmail.send_message",
        status: "completed",
        externalId: "sent-1",
      }),
    );
  });

  it("normalizes missing Gmail credentials without leaking tokens", async () => {
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "read", {
      operation: "gmail.list_messages",
      deps: { getAccessToken: async () => null },
    });
    expect(result.ok).toBe(false);
    expect(["not_connected", "requires_reauth"]).toContain(result.code);
    assertNoSecretLeak(result);
  });

  it("normalizes Gmail provider HTTP errors", async () => {
    const result = await executeProviderCapabilityForActor(actorA, "gmail", "read", {
      operation: "gmail.list_messages",
      deps: {
        getAccessToken: async () => "ya29.access-secret",
        fetchImpl: async () => new Response("boom", { status: 500 }),
      },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("provider_error");
    assertNoSecretLeak(result);
  });
});

describe("YouTube adapter execution", () => {
  it("publishes through the existing social YouTube adapter", async () => {
    const result = await executeProviderCapabilityForActor(actorA, "youtube", "publish", {
      campaignItemId: "item-yt-1",
      title: "Phase 3 video",
      description: "Shop now",
      mediaAssetId: "asset-1",
      contentType: "video",
    });
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ kind: "ok", externalId: "yt-confirmed-1" });
    assertNoSecretLeak(result);
  });

  it("does not fake YouTube success for unimplemented capabilities", async () => {
    const result = await executeProviderCapabilityForActor(actorA, "youtube", "schedule", {
      campaignItemId: "item-yt-1",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("not_implemented");
  });
});
