/**
 * Phase 64.0 — YouTube publish production readiness + deferred test gaps.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  setCreativePublishLoadStateForTests,
} from "@/app/lib/creative/publish";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import {
  createMemoryCreativeBlobStore,
  setCreativeBlobStoreForTests,
} from "@/app/lib/creative/blobStore";
import { loadCreativeAssetMedia } from "@/app/lib/creative/loadCreativeAssetMedia";
import {
  acquireCreativePublishAttempt,
  seedMemoryPublishAttemptForTests,
  setPublishAttemptStoreForTests,
} from "@/app/lib/creative/publishIdempotency";
import {
  setPersistPublishResultForTests,
} from "@/app/lib/creative/persistPublishResult";
import {
  hasActiveSocialCredential,
  setSocialCredentialStoreForTests,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import {
  publishCreativeToYouTube,
  setYouTubeUploadDepsForTests,
} from "@/app/lib/social/adapters/youtubePublish";
import { evaluateYouTubePublishReadiness } from "@/app/lib/social/publishReadiness";
import { buildHealthPayload } from "@/app/lib/production/health";
import { parseProductionReadinessFromHealth } from "@/app/lib/production/clientReadiness";
import { disconnectYouTubeForActor } from "@/app/lib/social/oauth/youtube";
import { setSocialOAuthStateStoreForTests } from "@/app/lib/social/oauth/state";
import { POST as publishRoutePost } from "@/app/api/v1/agents/creative/publish/route";
import { POST as connectRoutePost } from "@/app/api/v1/agents/social/youtube/connect/route";
import { GET as callbackRouteGet } from "@/app/api/v1/agents/social/youtube/callback/route";
import { POST as disconnectRoutePost } from "@/app/api/v1/agents/social/youtube/disconnect/route";
import * as agentsPersistence from "@/app/lib/agents/persistence";
import * as invokeSocialPublish from "@/app/lib/creative/invokeSocialPublish";
import { NextResponse } from "next/server";

const ORG_A = "11111111-1111-4111-8111-111111111111";

function actorFor(organizationId: string): Actor {
  return {
    userId: "user_phase640",
    email: "phase640@example.com",
    name: "Phase 640",
    organizationId,
    workspaceId: "ws_phase640",
    membershipId: "mem_phase640",
    role: "OWNER",
    sessionToken: "session_phase640",
  };
}

function youtubeVideoProject(organizationId: string): CreativeProject {
  const assetId = "casset_phase640_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase640", assetId);
  return {
    id: "creative_phase640",
    organizationId,
    profileId: "profile_1",
    name: "Phase 64 YouTube",
    creativeType: "VIDEO_AD",
    platform: "youtube",
    status: "COMPLETED",
    brief: {
      productOrService: "Jackets",
      targetAudience: "Shoppers",
      campaignGoal: "Awareness",
      language: "en",
      tone: "friendly",
      durationSeconds: 15,
      aspectRatio: "16:9",
      cta: "Shop now",
      brandNotes: "Clean",
      customerRequest: "Publish video",
    },
    concepts: [
      {
        id: "concept_1",
        title: "Spring",
        summary: "Spring jackets",
        hook: "New drop",
        angle: "product",
      },
    ],
    productionPlan: {
      summary: "Video ad",
      creativeType: "VIDEO_AD",
      platform: "youtube",
      modality: "video",
      estimatedDurationSeconds: 15,
      aspectRatio: "16:9",
      requiresExternalGeneration: true,
      checklist: ["generate"],
    },
    productionResult: {
      available: true,
      generated: true,
      status: "completed",
      reason: "generated",
      providerId: "openai",
      assets: [
        {
          providerId: "openai",
          providerAssetId: assetId,
          url,
          mimeType: "video/mp4",
          durationMs: 15000,
        },
      ],
    },
    publishExecutionJobId: "publish_job_640",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  };
}

function publishState(
  organizationId: string,
  socialAccountState: "CONNECTED" | "DISCONNECTED" = "CONNECTED",
): AgentsPersistedState {
  const project = youtubeVideoProject(organizationId);
  const approval: AgentApproval = {
    id: "publish_approval_640",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_640",
    stepId: "step_1",
    toolId: "creative_publish",
    action: "creative_publish",
    reason: "External publish",
    state: "APPROVED",
    requestedAt: "2026-08-28T00:00:00.000Z",
    decidedAt: "2026-08-28T00:01:00.000Z",
    decidedBy: "op",
  };
  const job: ExecutionJob = {
    id: "publish_job_640",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_publish",
    title: "Publish",
    status: "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: approval.id,
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 1,
    retryable: false,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    taskId: "task_publish_640",
    params: { creativeId: project.id, growthAction: "creative_publish" },
  };
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    socialAccounts: [
      {
        id: "sacc_640",
        organizationId,
        platform: "youtube",
        state: socialAccountState,
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
    ],
    campaigns: [],
    growthProfiles: [],
    tasks: [],
    socialContent: [],
    websiteProjects: [],
    runtimes: [],
    executions: [],
    stepExecutions: [],
    memories: [],
    knowledge: [],
    plans: [],
    traces: [],
    messages: [],
    contexts: [],
    settings: [],
    toolInvocationCount24h: 0,
    growthStrategies: [],
    socialStrategies: [],
    socialCalendars: [],
    publishingJobs: [],
    growthInsights: [],
    executionAttempts: [],
    executionEvents: [],
    growthCrmLinks: [],
    campaignCrmSyncs: [],
    crmFollowUps: [],
  };
}

const actorMocks = vi.hoisted(() => ({
  actor: null as Actor | null,
}));

vi.mock("@/app/lib/tenancy", () => ({
  requireCurrentActor: vi.fn(async () => {
    if (!actorMocks.actor) throw new Error("actor_not_seeded");
    return actorMocks.actor;
  }),
}));

const rateLimitMocks = vi.hoisted(() => ({
  limited: false,
}));

vi.mock("@/app/lib/security/rate-limit", () => ({
  rateLimitResponse: vi.fn(async () =>
    rateLimitMocks.limited
      ? NextResponse.json({ ok: false, message: "rate_limited" }, { status: 429 })
      : null,
  ),
}));

describe("Phase 64.0 publish readiness", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      "AGXORA_YOUTUBE_PUBLISH_ENABLED",
      "AGXORA_YOUTUBE_OAUTH_CLIENT_ID",
      "AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET",
      "AGXORA_YOUTUBE_OAUTH_REDIRECT_URI",
      "AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY",
      "AGXORA_CREATIVE_BLOB_STORE",
      "AGXORA_CREATIVE_BLOB_S3_BUCKET",
      "AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID",
      "AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY",
    ]) {
      envBackup[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("reports ready when YouTube publish is disabled", () => {
    delete process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED;
    const result = evaluateYouTubePublishReadiness();
    expect(result.enabled).toBe(false);
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("fails closed when enabled without OAuth, encryption, and blob store", () => {
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    delete process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID;
    delete process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY;
    delete process.env.AGXORA_CREATIVE_BLOB_STORE;

    const result = evaluateYouTubePublishReadiness();
    expect(result.enabled).toBe(true);
    expect(result.ready).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "youtube_oauth_not_configured",
        "social_oauth_encryption_key",
        "creative_blob_store_not_s3",
      ]),
    );
  });

  it("exposes publishReadiness on health without secrets", () => {
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
    process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.AGXORA_CREATIVE_BLOB_STORE = "s3";
    process.env.AGXORA_CREATIVE_BLOB_S3_BUCKET = "bucket";
    process.env.AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID = "key";
    process.env.AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY = "secret";

    const health = buildHealthPayload();
    expect(health.publishReadiness.enabled).toBe(true);
    expect(health.publishReadiness.ready).toBe(true);
    expect(health.publishReadiness.issueCodes).toEqual([]);
    expect(JSON.stringify(health)).not.toContain("secret");
  });

  it("client parser combines production and publish readiness", () => {
    const parsed = parseProductionReadinessFromHealth({
      productionGate: { enforced: true, ready: true, issueCodes: [] },
      publishReadiness: {
        enabled: true,
        ready: false,
        issueCodes: ["youtube_oauth_not_configured"],
      },
    });
    expect(parsed.ready).toBe(false);
    expect(parsed.publishIssueCodes).toEqual(["youtube_oauth_not_configured"]);
    expect(parsed.issueCodes).toContain("youtube_oauth_not_configured");
  });
});

describe("Phase 64.0 idempotency gaps", () => {
  beforeEach(() => {
    setPublishAttemptStoreForTests(null);
  });

  afterEach(() => {
    setPublishAttemptStoreForTests(null);
  });

  it("reclaims stale in_flight publish attempt", async () => {
    seedMemoryPublishAttemptForTests({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_stale",
      status: "in_flight",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const result = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_stale",
      creativeProjectId: "creative_phase640",
      assetId: "asset_1",
      platform: "youtube",
    });
    expect(result.kind).toBe("acquired");
  });

  it("requires new job after failed attempt without externalId", async () => {
    seedMemoryPublishAttemptForTests({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_failed",
      status: "failed",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_failed",
      creativeProjectId: "creative_phase640",
      assetId: "asset_1",
      platform: "youtube",
    });
    expect(result).toEqual({
      kind: "requires_new_job",
      reason: "failed_without_external_id",
    });
  });
});

describe("Phase 64.0 YouTube disconnect", () => {
  let latestState: AgentsPersistedState | null = null;

  beforeEach(() => {
    latestState = publishState(ORG_A, "CONNECTED");
    setSocialCredentialStoreForTests(null);
    vi.spyOn(agentsPersistence, "getAgentOsStateForActor").mockImplementation(
      async () => latestState!,
    );
    vi.spyOn(agentsPersistence, "putAgentOsStateForActor").mockImplementation(
      async (_actor, state) => {
        latestState = state;
        return state;
      },
    );
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSocialCredentialStoreForTests(null);
  });

  it("revokes credential and sets SocialAccount DISCONNECTED", async () => {
    const actor = actorFor(ORG_A);
    await upsertSocialCredentialForActor(actor, "youtube", {
      tokens: { accessToken: "yt_token", refreshToken: "yt_refresh" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    });
    expect(await hasActiveSocialCredential(ORG_A, "youtube")).toBe(true);

    await disconnectYouTubeForActor(actor);

    expect(await hasActiveSocialCredential(ORG_A, "youtube")).toBe(false);
    const account = latestState?.socialAccounts.find((row) => row.platform === "youtube");
    expect(account?.state).toBe("DISCONNECTED");
  });
});

describe("Phase 64.0 object_s3 stream publish path", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCreativeBlobStoreForTests(createMemoryCreativeBlobStore());
    setYouTubeUploadDepsForTests(null);
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_CREATIVE_VIDEO_MAX_BYTES = String(1024 * 1024);
  });

  afterEach(() => {
    setCreativeBlobStoreForTests(null);
    setYouTubeUploadDepsForTests(null);
  });

  it("loads stream media from object store and publishes incrementally", async () => {
    const blobStore = createMemoryCreativeBlobStore();
    setCreativeBlobStoreForTests(blobStore);
    const objectKey = "org/creative/object.mp4";
    const bytes = new Uint8Array(600_000);
    bytes.fill(42);
    await blobStore.putObject({ key: objectKey, bytes, mimeType: "video/mp4" });

    const media = await loadCreativeAssetMedia({
      id: "asset_stream",
      organizationId: ORG_A,
      creativeProjectId: "creative_phase640",
      mimeType: "video/mp4",
      byteSize: bytes.byteLength,
      storageBackend: "object_s3",
      objectBucket: "bucket",
      objectKey,
      modality: "video",
      providerId: "openai",
      providerAssetId: "prov",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(media.mode).toBe("stream");

    const uploadedChunkSizes: number[] = [];
    let initBody = "";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("uploadType=resumable")) {
        initBody = String(init?.body ?? "");
        return new Response(null, {
          status: 200,
          headers: { Location: "https://upload.example/resumable" },
        });
      }
      if (init?.headers && "Content-Range" in (init.headers as Record<string, string>)) {
        const contentLength = Number(
          (init.headers as Record<string, string>)["Content-Length"] ?? "0",
        );
        if (contentLength > 0) uploadedChunkSizes.push(contentLength);
      }
      if (init?.headers && (init.headers as Record<string, string>)["Content-Length"] === "0") {
        return Response.json({ id: "video_stream_640" });
      }
      return new Response(null, { status: 308 });
    });

    setYouTubeUploadDepsForTests({ now: () => Date.now(), fetch: fetchMock as typeof fetch });

    const project = youtubeVideoProject(ORG_A);
    const result = await publishCreativeToYouTube({
      project,
      target: {
        socialPlatform: "youtube",
        contentType: "video",
        adapterAction: "publishPost",
      },
      media,
      accessToken: "yt_access",
    });

    expect(result.published).toBe(true);
    expect(result.externalId).toBe("video_stream_640");
    expect(uploadedChunkSizes.length).toBeGreaterThan(1);
    expect(Math.max(...uploadedChunkSizes)).toBeLessThanOrEqual(256 * 1024);
    expect(initBody).toContain('"privacyStatus":"private"');
  });
});

describe("Phase 64.0 YouTube upload guards and error taxonomy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setYouTubeUploadDepsForTests(null);
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_CREATIVE_VIDEO_MAX_BYTES = "1000";
    process.env.AGXORA_YOUTUBE_UPLOAD_MAX_DURATION_MS = "5000";
  });

  afterEach(() => {
    setYouTubeUploadDepsForTests(null);
  });

  it("returns youtube_upload_size_exceeded for oversized buffer media", async () => {
    const project = youtubeVideoProject(ORG_A);
    const result = await publishCreativeToYouTube({
      project,
      target: {
        socialPlatform: "youtube",
        contentType: "video",
        adapterAction: "publishPost",
      },
      media: {
        mode: "buffer",
        mimeType: "video/mp4",
        byteSize: 2000,
        bytes: new Uint8Array(2000),
        assetId: "asset_1",
      },
      accessToken: "yt_access",
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("youtube_upload_size_exceeded");
  });

  it("returns youtube_upload_timeout when duration guard elapses", async () => {
    let now = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.includes("uploadType=resumable")) {
        now += 6000;
        return new Response(null, {
          status: 200,
          headers: { Location: "https://upload.example/resumable" },
        });
      }
      return new Response(null, { status: 500 });
    });
    setYouTubeUploadDepsForTests({ now: () => now, fetch: fetchMock as typeof fetch });

    const project = youtubeVideoProject(ORG_A);
    const result = await publishCreativeToYouTube({
      project,
      target: {
        socialPlatform: "youtube",
        contentType: "video",
        adapterAction: "publishPost",
      },
      media: {
        mode: "buffer",
        mimeType: "video/mp4",
        byteSize: 8,
        bytes: new Uint8Array(8),
        assetId: "asset_1",
      },
      accessToken: "yt_access",
    });
    expect(result.reason).toBe("youtube_upload_timeout");
  });

  it("returns youtube_resumable_init_failed without leaking response bodies", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("secret-google-body", { status: 403 }),
    );
    setYouTubeUploadDepsForTests({ now: () => Date.now(), fetch: fetchMock as typeof fetch });

    const project = youtubeVideoProject(ORG_A);
    const result = await publishCreativeToYouTube({
      project,
      target: {
        socialPlatform: "youtube",
        contentType: "video",
        adapterAction: "publishPost",
      },
      media: {
        mode: "buffer",
        mimeType: "video/mp4",
        byteSize: 8,
        bytes: new Uint8Array(8),
        assetId: "asset_1",
      },
      accessToken: "yt_access",
    });
    expect(result.reason).toBe("youtube_resumable_init_failed");
    expect(JSON.stringify(result)).not.toContain("secret-google-body");
    expect(JSON.stringify(result)).not.toContain("yt_access");
  });

  it("honors AGXORA_YOUTUBE_DEFAULT_PRIVACY_STATUS server config", async () => {
    process.env.AGXORA_YOUTUBE_DEFAULT_PRIVACY_STATUS = "unlisted";
    process.env.AGXORA_CREATIVE_VIDEO_MAX_BYTES = "104857600";
    let initBody = "";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("uploadType=resumable")) {
        initBody = String(init?.body ?? "");
        return new Response(null, {
          status: 200,
          headers: { Location: "https://upload.example/resumable" },
        });
      }
      if (init?.headers && (init.headers as Record<string, string>)["Content-Length"] === "0") {
        return Response.json({ id: "video_privacy_640" });
      }
      return new Response(null, { status: 308 });
    });
    setYouTubeUploadDepsForTests({ now: () => Date.now(), fetch: fetchMock as typeof fetch });

    const project = youtubeVideoProject(ORG_A);
    await publishCreativeToYouTube({
      project,
      target: {
        socialPlatform: "youtube",
        contentType: "video",
        adapterAction: "publishPost",
      },
      media: {
        mode: "buffer",
        mimeType: "video/mp4",
        byteSize: 8,
        bytes: new Uint8Array(8),
        assetId: "asset_1",
      },
      accessToken: "yt_access",
    });
    expect(initBody).toContain('"privacyStatus":"unlisted"');
  });
});

describe("Phase 64.0 OAuth route behavior", () => {
  let latestState: AgentsPersistedState | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    latestState = publishState(ORG_A, "CONNECTED");
    actorMocks.actor = actorFor(ORG_A);
    rateLimitMocks.limited = false;
    setSocialCredentialStoreForTests(null);
    setSocialOAuthStateStoreForTests(null);
    setPersistPublishResultForTests(null);
    vi.spyOn(agentsPersistence, "getAgentOsStateForActor").mockImplementation(
      async () => latestState!,
    );
    vi.spyOn(agentsPersistence, "putAgentOsStateForActor").mockImplementation(
      async (_actor, state) => {
        latestState = state;
        return state;
      },
    );
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
  });

  afterEach(() => {
    actorMocks.actor = null;
    vi.restoreAllMocks();
    setSocialCredentialStoreForTests(null);
    setSocialOAuthStateStoreForTests(null);
  });

  it("connect route returns authorizationUrl", async () => {
    setSocialOAuthStateStoreForTests(null);

    const response = await connectRoutePost(
      new Request("https://app.example/api/v1/agents/social/youtube/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/agents?tab=social" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { authorizationUrl?: string };
    expect(body.authorizationUrl).toContain("accounts.google.com");
  });

  it("connect route returns 429 when rate limited", async () => {
    rateLimitMocks.limited = true;
    const response = await connectRoutePost(
      new Request("https://app.example/api/v1/agents/social/youtube/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(429);
  });

  it("callback route rejects missing parameters", async () => {
    const response = await callbackRouteGet(
      new Request("https://app.example/api/v1/agents/social/youtube/callback"),
    );
    expect(response.status).toBe(400);
  });

  it("disconnect route succeeds and revokes credential", async () => {
    const actor = actorFor(ORG_A);
    actorMocks.actor = actor;
    await upsertSocialCredentialForActor(actor, "youtube", {
      tokens: { accessToken: "yt_token", refreshToken: "yt_refresh" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    });
    expect(await hasActiveSocialCredential(ORG_A, "youtube")).toBe(true);

    const response = await disconnectRoutePost(
      new Request("https://app.example/api/v1/agents/social/youtube/disconnect", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    expect(await hasActiveSocialCredential(ORG_A, "youtube")).toBe(false);
  });
});

describe("Phase 64.0 creative publish HTTP route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    actorMocks.actor = actorFor(ORG_A);
    rateLimitMocks.limited = false;
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    setPersistPublishResultForTests(async (actor, state) => state);
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
  });

  afterEach(() => {
    actorMocks.actor = null;
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    setPersistPublishResultForTests(null);
    setCreativeAssetStoreForTests(null);
  });

  it("returns publish result on successful HTTP request", async () => {
    const state = publishState(ORG_A, "CONNECTED");
    setCreativePublishLoadStateForTests(async () => state);
    const store = createMemoryCreativeAssetStore();
    setCreativeAssetStoreForTests(store);
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase640",
      assetId: "casset_phase640_primary",
      mimeType: "video/mp4",
      bytes: new Uint8Array(8),
      byteSize: 8,
      durationMs: 15000,
      modality: "video",
      providerId: "openai",
      providerAssetId: "prov",
    });
    await upsertSocialCredentialForActor(actorFor(ORG_A), "youtube", {
      tokens: { accessToken: "yt_access", refreshToken: "yt_refresh" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    });

    const publishSpy = vi
      .spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish")
      .mockResolvedValue({
        available: true,
        status: "published",
        published: true,
        reason: "published",
        externalId: "video_http_640",
      });

    const response = await publishRoutePost(
      new Request("https://app.example/api/v1/agents/creative/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeProjectId: "creative_phase640" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      publishResult?: { published?: boolean; externalId?: string };
    };
    expect(body.publishResult?.published).toBe(true);
    expect(body.publishResult?.externalId).toBe("video_http_640");
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it("returns forbidden on auth failure via HTTP route", async () => {
    const state = publishState(ORG_A, "CONNECTED");
    state.approvals[0] = { ...state.approvals[0]!, state: "REJECTED" };
    setCreativePublishLoadStateForTests(async () => state);

    const response = await publishRoutePost(
      new Request("https://app.example/api/v1/agents/creative/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeProjectId: "creative_phase640" }),
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
