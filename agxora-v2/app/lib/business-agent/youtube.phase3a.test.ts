import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignItem } from "@prisma/client";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { SocialProviderAdapter } from "@/app/lib/social/adapters/provider";
import { publishCreativeToYouTube } from "@/app/lib/social/adapters/youtubePublish";
import { setYouTubeUploadDepsForTests } from "@/app/lib/social/adapters/youtubePublish";
import {
  setYouTubeCampaignAdapterDepsForTests,
  youtubeCampaignAdapter,
} from "@/app/lib/social/adapters/youtubeCampaignAdapter";
import { setSocialProviderAdapterForTests } from "@/app/lib/social/adapters/registry";
import { loadCreativeAssetMedia } from "@/app/lib/creative/loadCreativeAssetMedia";
import type { CreativeAssetRecord } from "@/app/lib/creative/assetStore";

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
import { redactSecrets } from "./redact";

const YOUTUBE_CONFIRMED_VIDEO_ID = "video_stream_640";

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

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toMatch(/ya29\./);
  expect(serialized).not.toContain("refresh-secret");
  expect(serialized).not.toContain("access-secret");
  expect(serialized).not.toContain("youtube-client-secret");
  expect(serialized).not.toContain("AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET");
  expect(serialized).not.toMatch(/sk-[a-zA-Z0-9]/);
}

function seedItem(overrides: Partial<CampaignItem> = {}): CampaignItem {
  const now = new Date("2026-09-07T12:00:00.000Z");
  const item = {
    id: overrides.id ?? "item-yt-1",
    campaignId: "camp-1",
    organizationId: actorA.organizationId,
    workspaceId: actorA.workspaceId,
    createdByUserId: actorA.userId,
    approvedByUserId: null,
    provider: "youtube",
    contentType: "video",
    title: "Spring jackets",
    caption: "Shop now",
    body: "",
    script: "",
    mediaRequirement: "casset_phase640_primary",
    scheduledAt: null,
    publishedAt: null,
    status: "NEEDS_APPROVAL",
    externalId: null,
    externalUrl: null,
    error: null,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as CampaignItem;
  items.rows.set(item.id, item);
  return item;
}

function youtubeAdapter(publishVideo: SocialProviderAdapter["publishVideo"]): SocialProviderAdapter {
  return {
    providerId: "youtube",
    getCapabilities() {
      return {
        listAccounts: true,
        publishText: false,
        publishImage: false,
        publishVideo: true,
        schedule: false,
        getPublishStatus: false,
        getInsights: false,
      };
    },
    async listAccounts() {
      return { kind: "ok", accounts: [] };
    },
    async publishText() {
      return { kind: "unsupported", reason: "youtube_text_unsupported" };
    },
    async publishImage() {
      return { kind: "unsupported", reason: "youtube_image_unsupported" };
    },
    publishVideo,
    async schedule() {
      return { kind: "unsupported", reason: "youtube_schedule_not_implemented" };
    },
    async getPublishStatus() {
      return { kind: "unsupported", reason: "youtube_status_not_implemented" };
    },
    async getInsights() {
      return { kind: "unsupported", reason: "youtube_analytics_not_implemented" };
    },
  };
}

describe("Phase 3A YouTube social agent core", () => {
  beforeEach(() => {
    items.rows.clear();
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
    setSocialProviderAdapterForTests(null);
    setYouTubeCampaignAdapterDepsForTests(null);
    setYouTubeUploadDepsForTests(null);
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    vi.mocked(recordExternalAction).mockClear();
  });

  afterEach(() => {
    setSocialProviderAdapterForTests(null);
    setYouTubeCampaignAdapterDepsForTests(null);
    setYouTubeUploadDepsForTests(null);
  });

  it("blocks SAFE unapproved YouTube publish before the provider call", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({ status: "NEEDS_APPROVAL" });

    await expect(
      executeCampaignItemForActor(actorA, item.id, "publish"),
    ).rejects.toMatchObject({
      code: "forbidden",
      message: "SAFE MODE requires explicit approval before external actions",
    });

    expect(publishVideo).not.toHaveBeenCalled();
    expect(items.rows.get(item.id)?.status).toBe("NEEDS_APPROVAL");
    expect(items.rows.get(item.id)?.externalId).toBeNull();
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "publish",
        status: "approval_required",
        error: "safe_mode_requires_approval",
      }),
    );
    assertNoSecretLeak(items.rows.get(item.id));
  });

  it("blocks approved YouTube publish when canPublish is false", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = false;

    await expect(
      executeCampaignItemForActor(actorA, item.id, "publish"),
    ).rejects.toMatchObject({
      code: "forbidden",
      message: "Permission publish is not granted for youtube",
    });

    expect(publishVideo).not.toHaveBeenCalled();
    expect(items.rows.get(item.id)?.status).toBe("APPROVED");
    expect(items.rows.get(item.id)?.externalId).toBeNull();
  });

  it("does not mark unsupported providers as PUBLISHED", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({
      provider: "instagram",
      status: "APPROVED",
      approvedByUserId: actorA.userId,
    });
    policyState.flags.canPublish = true;

    await expect(
      executeCampaignItemForActor(actorA, item.id, "publish"),
    ).rejects.toMatchObject({
      status: 501,
      message: "Integration not implemented yet",
    });

    expect(publishVideo).not.toHaveBeenCalled();
    expect(items.rows.get(item.id)?.status).toBe("FAILED");
    expect(items.rows.get(item.id)?.externalId).toBeNull();
  });

  it("does not mark human_required YouTube results as PUBLISHED", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "human_required" as const,
      reason: "youtube_studio_confirmation_required",
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;

    await expect(
      executeCampaignItemForActor(actorA, item.id, "publish"),
    ).rejects.toMatchObject({
      status: 409,
    });

    expect(publishVideo).toHaveBeenCalledTimes(1);
    expect(items.rows.get(item.id)?.status).toBe("FAILED");
    expect(items.rows.get(item.id)?.externalId).toBeNull();
    expect(items.rows.get(item.id)?.error).toBe("youtube_studio_confirmation_required");
  });

  it("maps YouTube provider failure to FAILED without an externalId", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "failed" as const,
      reason: "youtube_chunk_upload_failed",
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;

    await expect(
      executeCampaignItemForActor(actorA, item.id, "publish"),
    ).rejects.toMatchObject({
      status: 502,
    });

    expect(items.rows.get(item.id)?.status).toBe("FAILED");
    expect(items.rows.get(item.id)?.externalId).toBeNull();
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "youtube.publish_video",
        status: "failed",
        error: "youtube_chunk_upload_failed",
      }),
    );
  });

  it("marks PUBLISHED only after official YouTube confirmation", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;

    const published = await executeCampaignItemForActor(actorA, item.id, "publish");
    expect(published.status).toBe("PUBLISHED");
    expect(published.externalId).toBe(YOUTUBE_CONFIRMED_VIDEO_ID);
    expect(publishVideo).toHaveBeenCalledTimes(1);
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "youtube.publish_video",
        status: "completed",
        externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
      }),
    );
    assertNoSecretLeak(published);
  });

  it("does not start a duplicate YouTube publish for the same item", async () => {
    const publishVideo = vi.fn(async () => ({
      kind: "ok" as const,
      externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
    }));
    setSocialProviderAdapterForTests(youtubeAdapter(publishVideo));
    const item = seedItem({ status: "APPROVED", approvedByUserId: actorA.userId });
    policyState.flags.canPublish = true;

    const first = await executeCampaignItemForActor(actorA, item.id, "publish");
    const second = await executeCampaignItemForActor(actorA, item.id, "publish");

    expect(first.externalId).toBe(YOUTUBE_CONFIRMED_VIDEO_ID);
    expect(second.externalId).toBe(YOUTUBE_CONFIRMED_VIDEO_ID);
    expect(publishVideo).toHaveBeenCalledTimes(1);
    expect(recordExternalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { idempotentReplay: true },
        externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
      }),
    );
  });

  it("rejects unauthenticated execute with 401", async () => {
    actorRef.current = null;
    const response = await executeItem(
      new Request("http://localhost/api/v1/campaigns/items/item-yt-1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "publish" }),
      }),
      { params: Promise.resolve({ id: "item-yt-1" }) },
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    assertNoSecretLeak(body);
  });

  it("redacts tokens from audit-shaped YouTube payloads", () => {
    const redacted = redactSecrets({
      access_token: "ya29.youtube-secret",
      refresh_token: "refresh-secret",
      client_secret: "youtube-client-secret",
      ok: true,
    });
    expect(redacted.access_token).toBe("[redacted]");
    expect(redacted.refresh_token).toBe("[redacted]");
    expect(redacted.client_secret).toBe("[redacted]");
    expect(redacted.ok).toBe(true);
    assertNoSecretLeak(redacted);
  });

  it("reports only capabilities the current YouTube adapter actually supports", () => {
    const capabilities = youtubeCampaignAdapter.getCapabilities();
    expect(capabilities.publishVideo).toBe(true);
    expect(capabilities.listAccounts).toBe(true);
    expect(capabilities.publishText).toBe(false);
    expect(capabilities.publishImage).toBe(false);
    expect(capabilities.schedule).toBe(false);
    expect(capabilities.getInsights).toBe(false);
    expect(capabilities.getPublishStatus).toBe(false);
  });

  it("confirms publishVideo only after the official resumable upload returns an id", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("uploadType=resumable")) {
        return new Response(null, {
          status: 200,
          headers: { Location: "https://upload.example/resumable" },
        });
      }
      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (headers["Content-Length"] === "0" || url.includes("upload.example")) {
        return Response.json({ id: YOUTUBE_CONFIRMED_VIDEO_ID });
      }
      return new Response(null, { status: 308 });
    });
    setYouTubeUploadDepsForTests({
      now: () => Date.now(),
      fetch: fetchMock as typeof fetch,
    });

    const asset: CreativeAssetRecord = {
      id: "casset_phase640_primary",
      organizationId: actorA.organizationId,
      creativeProjectId: "creative_phase640",
      mimeType: "video/mp4",
      byteSize: 32,
      storageBackend: "inline_bytea",
      bytes: new Uint8Array(32),
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
    };

    setYouTubeCampaignAdapterDepsForTests({
      getAccessToken: async () => "yt_access",
      getCredentialSummary: async () => ({
        platform: "youtube",
        externalAccountId: "channel-1",
        externalAccountName: "AGXORA",
      }),
      loadAsset: async () => asset,
      loadMedia: loadCreativeAssetMedia,
      publishCreative: publishCreativeToYouTube,
    });

    const result = await youtubeCampaignAdapter.publishVideo({
      actor: actorA,
      campaignItemId: "item-yt-1",
      title: "Phase 64 YouTube",
      description: "Shop now",
      mediaAssetId: asset.id,
      contentType: "video",
    });

    expect(result).toEqual({
      kind: "ok",
      externalId: YOUTUBE_CONFIRMED_VIDEO_ID,
    });
    expect(fetchMock).toHaveBeenCalled();
    assertNoSecretLeak(result);
  });

  it("does not invent a YouTube id when the official upload omits confirmation", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.includes("uploadType=resumable")) {
        return new Response(null, {
          status: 200,
          headers: { Location: "https://upload.example/resumable" },
        });
      }
      return Response.json({});
    });
    setYouTubeUploadDepsForTests({
      now: () => Date.now(),
      fetch: fetchMock as typeof fetch,
    });
    const asset: CreativeAssetRecord = {
      id: "casset_phase640_primary",
      organizationId: actorA.organizationId,
      creativeProjectId: "creative_phase640",
      mimeType: "video/mp4",
      byteSize: 32,
      storageBackend: "inline_bytea",
      bytes: new Uint8Array(32),
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
    };
    setYouTubeCampaignAdapterDepsForTests({
      getAccessToken: async () => "yt_access",
      getCredentialSummary: async () => ({ platform: "youtube" }),
      loadAsset: async () => asset,
      loadMedia: loadCreativeAssetMedia,
      publishCreative: publishCreativeToYouTube,
    });

    const result = await youtubeCampaignAdapter.publishVideo({
      actor: actorA,
      campaignItemId: "item-yt-1",
      title: "Phase 64 YouTube",
      description: "Shop now",
      mediaAssetId: asset.id,
      contentType: "video",
    });
    expect(result.kind).not.toBe("ok");
    if (result.kind !== "ok") {
      expect(result.reason).toBe("youtube_missing_video_id");
    }
  });
});
