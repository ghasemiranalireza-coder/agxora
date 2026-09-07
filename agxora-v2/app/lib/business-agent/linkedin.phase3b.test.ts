import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignItem } from "@prisma/client";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { SocialProviderAdapter } from "@/app/lib/social/adapters/provider";
import {
  linkedinCampaignAdapter,
  setLinkedInCampaignAdapterDepsForTests,
} from "@/app/lib/social/adapters/linkedinCampaignAdapter";
import { setSocialProviderAdapterForTests } from "@/app/lib/social/adapters/registry";
import { setLinkedInOAuthHttpForTests } from "@/app/lib/social/oauth/linkedin";
import { beginLinkedInOAuthForActor } from "@/app/lib/social/oauth/linkedin";
import { redactSecrets } from "./redact";

const LINKEDIN_CONFIRMED_POST_ID = "urn:li:share:phase3b-confirmed";

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

const items = vi.hoisted(() => ({
  rows: new Map<string, CampaignItem>(),
}));

const actorRef = vi.hoisted(() => ({ current: null as Actor | null }));

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
    assertProviderPermission: vi.fn(async (_actor, provider, permission) => {
      const granted =
        permission === "read"
          ? policyState.flags.canRead
          : permission === "create_draft"
            ? policyState.flags.canCreateDraft
            : permission === "publish"
              ? policyState.flags.canPublish
              : permission === "schedule"
                ? policyState.flags.canSchedule
                : permission === "send_email"
                  ? policyState.flags.canSendEmail
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

vi.mock("./audit", () => ({
  recordExternalAction: vi.fn(async () => {}),
}));

vi.mock("@/app/lib/db/prisma", () => {
  function applyUpdate(item: CampaignItem, data: Record<string, unknown>): CampaignItem {
    const next = { ...item };
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && "increment" in value) {
        const current = Number((next as Record<string, unknown>)[key] ?? 0);
        (next as Record<string, unknown>)[key] =
          current + Number((value as { increment: number }).increment);
      } else {
        (next as Record<string, unknown>)[key] = value;
      }
    }
    next.updatedAt = new Date();
    return next;
  }

  return {
    prisma: {
      campaignItem: {
        findFirst: vi.fn(async ({ where }: { where: Record<string, string> }) => {
          const item = items.rows.get(where.id);
          if (!item) return null;
          if (where.organizationId && item.organizationId !== where.organizationId) {
            return null;
          }
          if (where.workspaceId && item.workspaceId !== where.workspaceId) {
            return null;
          }
          return { ...item };
        }),
        update: vi.fn(async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const item = items.rows.get(where.id);
          if (!item) throw new Error("missing_item");
          const next = applyUpdate(item, data);
          items.rows.set(where.id, next);
          return { ...next };
        }),
        updateMany: vi.fn(async ({
          where,
          data,
        }: {
          where: Record<string, string>;
          data: Record<string, unknown>;
        }) => {
          const item = items.rows.get(where.id);
          if (!item) return { count: 0 };
          if (where.organizationId && item.organizationId !== where.organizationId) {
            return { count: 0 };
          }
          if (where.workspaceId && item.workspaceId !== where.workspaceId) {
            return { count: 0 };
          }
          if (where.status && item.status !== where.status) {
            return { count: 0 };
          }
          items.rows.set(where.id, applyUpdate(item, data));
          return { count: 1 };
        }),
      },
    },
  };
});

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

import { recordExternalAction } from "./audit";
import { executeCampaignItemForActor } from "./campaigns";
import { POST as executeItem } from "@/app/api/v1/campaigns/items/[id]/execute/route";
import { POST as connectLinkedIn } from "@/app/api/v1/agents/social/linkedin/connect/route";
import { GET as linkedInCallback } from "@/app/api/v1/agents/social/linkedin/callback/route";

const actorA: Actor = {
  userId: "user-a",
  organizationId: "org-a",
  workspaceId: "ws-a",
  role: "OWNER",
};

const actorB: Actor = {
  userId: "user-b",
  organizationId: "org-b",
  workspaceId: "ws-b",
  role: "OWNER",
};

function assertNoSecretLeak(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("AQX");
  expect(serialized).not.toContain("linkedin-client-secret");
  expect(serialized).not.toContain("li_access");
}

function seedItem(overrides: Partial<CampaignItem> = {}): CampaignItem {
  const item = {
    id: "item-li-1",
    organizationId: actorA.organizationId,
    workspaceId: actorA.workspaceId,
    campaignId: "camp-li-1",
    provider: "linkedin",
    contentType: "post",
    title: "Phase 3B LinkedIn",
    caption: "Shop now",
    body: "Official LinkedIn member post",
    script: "",
    mediaRequirement: "",
    status: "NEEDS_APPROVAL",
    scheduledAt: null,
    publishedAt: null,
    externalId: null,
    approvedByUserId: null,
    approvedAt: null,
    error: null,
    retryCount: 0,
    createdAt: new Date("2026-09-07T00:00:00.000Z"),
    updatedAt: new Date("2026-09-07T00:00:00.000Z"),
    ...overrides,
  } as CampaignItem;
  items.rows.set(item.id, item);
  return item;
}

function linkedinAdapter(
  publishText: SocialProviderAdapter["publishText"],
): SocialProviderAdapter {
  return {
    ...linkedinCampaignAdapter,
    providerId: "linkedin",
    publishText,
  };
}

describe("Phase 3B LinkedIn social publishing", () => {
  beforeEach(() => {
    items.rows.clear();
    actorRef.current = actorA;
    policyState.mode = "SAFE";
    policyState.flags.canPublish = false;
    setSocialProviderAdapterForTests(null);
    setLinkedInCampaignAdapterDepsForTests(null);
    setLinkedInOAuthHttpForTests(null);
    process.env.NODE_ENV = "test";
    process.env.AGXORA_LINKEDIN_PUBLISH_ENABLED = "true";
    process.env.AGXORA_LINKEDIN_OAUTH_CLIENT_ID = "linkedin-client-id";
    process.env.AGXORA_LINKEDIN_OAUTH_CLIENT_SECRET = "linkedin-client-secret";
    process.env.AGXORA_LINKEDIN_OAUTH_REDIRECT_URI =
      "http://localhost:3000/api/v1/agents/social/linkedin/callback";
    vi.clearAllMocks();
  });

  afterEach(() => {
    setSocialProviderAdapterForTests(null);
    setLinkedInCampaignAdapterDepsForTests(null);
    setLinkedInOAuthHttpForTests(null);
  });

  it("blocks SAFE mode LinkedIn publish without approval", async () => {
    seedItem({ status: "NEEDS_APPROVAL" });
    await expect(
      executeCampaignItemForActor(actorA, "item-li-1", "publish"),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(items.rows.get("item-li-1")?.status).toBe("NEEDS_APPROVAL");
    expect(items.rows.get("item-li-1")?.externalId).toBeNull();
  });

  it("requires canPublish before LinkedIn execute", async () => {
    seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = false;
    await expect(
      executeCampaignItemForActor(actorA, "item-li-1", "publish"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("isolates org B from org A LinkedIn items", async () => {
    seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;
    await expect(
      executeCampaignItemForActor(actorB, "item-li-1", "publish"),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("marks PUBLISHED only after official LinkedIn confirmation", async () => {
    const publishText = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: LINKEDIN_CONFIRMED_POST_ID,
    }));
    setSocialProviderAdapterForTests(linkedinAdapter(publishText));
    seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;

    const published = await executeCampaignItemForActor(actorA, "item-li-1", "publish");
    expect(published.status).toBe("PUBLISHED");
    expect(published.externalId).toBe(LINKEDIN_CONFIRMED_POST_ID);
    expect(publishText).toHaveBeenCalledTimes(1);
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "linkedin.publish_post",
        status: "completed",
        externalId: LINKEDIN_CONFIRMED_POST_ID,
      }),
    );
    assertNoSecretLeak(published);
  });

  it("does not start a duplicate LinkedIn publish for the same item", async () => {
    const publishText = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: LINKEDIN_CONFIRMED_POST_ID,
    }));
    setSocialProviderAdapterForTests(linkedinAdapter(publishText));
    seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;

    const first = await executeCampaignItemForActor(actorA, "item-li-1", "publish");
    const second = await executeCampaignItemForActor(actorA, "item-li-1", "publish");

    expect(first.externalId).toBe(LINKEDIN_CONFIRMED_POST_ID);
    expect(second.externalId).toBe(LINKEDIN_CONFIRMED_POST_ID);
    expect(publishText).toHaveBeenCalledTimes(1);
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { idempotentReplay: true },
        externalId: LINKEDIN_CONFIRMED_POST_ID,
      }),
    );
  });

  it("does not invent a LinkedIn id when UGC Posts omits confirmation", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 201 }));
    setLinkedInCampaignAdapterDepsForTests({
      getAccessToken: async () => "li_access",
      getCredentialSummary: async () => ({
        platform: "linkedin",
        externalAccountId: "member-1",
        externalAccountName: "AGXORA",
      }),
      fetch: fetchMock as typeof fetch,
    });

    const result = await linkedinCampaignAdapter.publishText({
      actor: actorA,
      campaignItemId: "item-li-1",
      title: "Phase 3B",
      description: "Shop now",
      body: "Hello LinkedIn",
      contentType: "post",
    });
    expect(result.kind).not.toBe("ok");
    if (result.kind !== "ok") {
      expect(result.reason).toBe("linkedin_missing_post_id");
    }
  });

  it("confirms publishText only after the official UGC Posts API returns an id", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: LINKEDIN_CONFIRMED_POST_ID }), {
        status: 201,
        headers: { "x-restli-id": LINKEDIN_CONFIRMED_POST_ID },
      }),
    );
    setLinkedInCampaignAdapterDepsForTests({
      getAccessToken: async () => "li_access",
      getCredentialSummary: async () => ({
        platform: "linkedin",
        externalAccountId: "member-1",
      }),
      fetch: fetchMock as typeof fetch,
    });

    const result = await linkedinCampaignAdapter.publishText({
      actor: actorA,
      campaignItemId: "item-li-1",
      title: "Phase 3B",
      description: "Shop now",
      body: "Hello LinkedIn",
      contentType: "post",
    });
    expect(result).toMatchObject({
      kind: "ok",
      externalId: LINKEDIN_CONFIRMED_POST_ID,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/ugcPosts",
      expect.objectContaining({ method: "POST" }),
    );
    assertNoSecretLeak(result);
  });

  it("starts official LinkedIn OAuth without returning secrets", async () => {
    const result = await beginLinkedInOAuthForActor(actorA, "/dashboard/integrations");
    expect(result.authorizationUrl).toContain("https://www.linkedin.com/oauth/v2/authorization");
    expect(result.authorizationUrl).toContain("w_member_social");
    expect(result.authorizationUrl).toContain("openid");
    expect(result.authorizationUrl).not.toContain("code_challenge");
    expect(result.authorizationUrl).not.toContain("code_verifier");
    expect(result.authorizationUrl).not.toContain("linkedin-client-secret");
    assertNoSecretLeak(result);
  });

  it("does not invent a LinkedIn id when media is attached", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "should-not-post" }), { status: 201 }));
    setLinkedInCampaignAdapterDepsForTests({
      getAccessToken: async () => "li_access",
      getCredentialSummary: async () => ({
        platform: "linkedin",
        externalAccountId: "member-1",
      }),
      fetch: fetchMock as typeof fetch,
    });
    const result = await linkedinCampaignAdapter.publishText({
      actor: actorA,
      campaignItemId: "item-li-1",
      title: "Phase 3B",
      description: "Shop now",
      body: "Hello LinkedIn",
      mediaAssetId: "asset-1",
      contentType: "post",
    });
    expect(result).toMatchObject({
      kind: "unsupported",
      reason: "linkedin_media_not_implemented",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not mark a post published when UGC Posts returns an error", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }),
    );
    setLinkedInCampaignAdapterDepsForTests({
      getAccessToken: async () => "li_access",
      getCredentialSummary: async () => ({
        platform: "linkedin",
        externalAccountId: "member-1",
      }),
      fetch: fetchMock as typeof fetch,
    });
    const result = await linkedinCampaignAdapter.publishText({
      actor: actorA,
      campaignItemId: "item-li-1",
      title: "Phase 3B",
      description: "Shop now",
      body: "Hello LinkedIn",
      contentType: "post",
    });
    expect(result).toMatchObject({
      kind: "failed",
      reason: "linkedin_ugc_post_failed",
    });
  });

  it("redirects cancelled LinkedIn OAuth without connecting", async () => {
    const response = await linkedInCallback(
      new Request(
        "http://localhost/api/v1/agents/social/linkedin/callback?error=user_cancelled_authorize&state=abc",
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("linkedin=denied");
  });

  it("rejects unauthenticated LinkedIn connect with 401", async () => {
    actorRef.current = null;
    const response = await connectLinkedIn(
      new Request("http://localhost/api/v1/agents/social/linkedin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/dashboard/integrations" }),
      }),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    assertNoSecretLeak(body);
  });

  it("rejects unauthenticated execute with 401", async () => {
    actorRef.current = null;
    const response = await executeItem(
      new Request("http://localhost/api/v1/campaigns/items/item-li-1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "publish" }),
      }),
      { params: Promise.resolve({ id: "item-li-1" }) },
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    assertNoSecretLeak(body);
  });

  it("redacts tokens from audit-shaped LinkedIn payloads", () => {
    const redacted = redactSecrets({
      access_token: "AQX-linkedin-secret",
      refresh_token: "refresh-secret",
      client_secret: "linkedin-client-secret",
      ok: true,
    });
    expect(redacted.access_token).toBe("[redacted]");
    expect(redacted.refresh_token).toBe("[redacted]");
    expect(redacted.client_secret).toBe("[redacted]");
    expect(redacted.ok).toBe(true);
    assertNoSecretLeak(redacted);
  });

  it("reports only capabilities the LinkedIn adapter actually supports", () => {
    const capabilities = linkedinCampaignAdapter.getCapabilities();
    expect(capabilities.publishText).toBe(true);
    expect(capabilities.listAccounts).toBe(true);
    expect(capabilities.publishImage).toBe(false);
    expect(capabilities.publishVideo).toBe(false);
    expect(capabilities.schedule).toBe(false);
    expect(capabilities.getInsights).toBe(false);
    expect(capabilities.getPublishStatus).toBe(false);
  });
});
