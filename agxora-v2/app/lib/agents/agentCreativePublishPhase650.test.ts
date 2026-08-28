/**
 * Phase 65.0 — async YouTube publish + cross-request resumable upload tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  publishCreativeForActor,
  setCreativePublishLoadStateForTests,
} from "@/app/lib/creative/publish";
import { isAsyncYouTubePublishEligible } from "@/app/lib/creative/publishAsyncEligibility";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
  getCreativeAssetStore,
} from "@/app/lib/creative/assetStore";
import {
  createMemoryCreativeBlobStore,
  setCreativeBlobStoreForTests,
} from "@/app/lib/creative/blobStore";
import {
  acquireCreativePublishAttempt,
  completeCreativePublishAttempt,
  getCreativePublishAttemptByJobId,
  setPublishAttemptStoreForTests,
} from "@/app/lib/creative/publishIdempotency";
import { setPersistPublishResultForTests } from "@/app/lib/creative/persistPublishResult";
import {
  setSocialCredentialStoreForTests,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import {
  setYouTubeResumableDepsForTests,
} from "@/app/lib/social/adapters/youtubeResumable";
import {
  setYouTubeUploadDepsForTests,
} from "@/app/lib/social/adapters/youtubePublish";
import { evaluateYouTubePublishReadiness } from "@/app/lib/social/publishReadiness";
import { buildHealthPayload } from "@/app/lib/production/health";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import {
  createYouTubeUploadSession,
  claimDueYouTubeUploadSessions,
  getEncryptedUploadUrlForTests,
  setYouTubeUploadSessionStoreForTests,
  updateYouTubeUploadSessionProgress,
} from "@/app/lib/creative/youtubeUploadSession";
import { processYouTubeUploadSession, runCreativePublishWorker } from "@/app/lib/creative/publishWorker";
import { assertCreativePublishWorkerAuthorized } from "@/app/lib/creative/publishWorkerAuth";
import { getCreativePublishStatusForActor } from "@/app/lib/creative/publishStatus";
import { POST as publishRoutePost } from "@/app/api/v1/agents/creative/publish/route";
import { GET as publishStatusRouteGet } from "@/app/api/v1/agents/creative/publish/status/route";
import { POST as workerRoutePost } from "@/app/api/v1/internal/creative/publish/worker/route";
import * as agentsPersistence from "@/app/lib/agents/persistence";
import * as invokeSocialPublish from "@/app/lib/creative/invokeSocialPublish";
import { publishCreativeToYouTube } from "@/app/lib/social/adapters/youtubePublish";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASYNC_THRESHOLD = 12 * 1024 * 1024;

function actorFor(organizationId: string, userId = USER_A): Actor {
  return {
    userId,
    email: "phase650@example.com",
    name: "Phase 650",
    organizationId,
    workspaceId: "ws_phase650",
    membershipId: "mem_phase650",
    role: "OWNER",
    sessionToken: "session_phase650",
  };
}

function youtubeVideoProject(organizationId: string): CreativeProject {
  const assetId = "casset_phase650_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase650", assetId);
  return {
    id: "creative_phase650",
    organizationId,
    profileId: "profile_1",
    name: "Phase 65 YouTube",
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
    publishExecutionJobId: "publish_job_650",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  };
}

function publishState(organizationId: string): AgentsPersistedState {
  const project = youtubeVideoProject(organizationId);
  const approval: AgentApproval = {
    id: "publish_approval_650",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_650",
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
    id: "publish_job_650",
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
    taskId: "task_publish_650",
    params: { creativeId: project.id, growthAction: "creative_publish" },
  };
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    socialAccounts: [
      {
        id: "sacc_650",
        organizationId,
        platform: "youtube",
        state: "CONNECTED",
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

vi.mock("@/app/lib/security/rate-limit", () => ({
  rateLimitResponse: vi.fn(async () => null),
}));

function youtubeFetchMock(videoId = "video_phase650"): typeof fetch {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("uploadType=resumable")) {
      return new Response(null, {
        status: 200,
        headers: { Location: "https://upload.example/resumable/phase650" },
      });
    }
    if (url.includes("oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "refreshed_token", expires_in: 3600 });
    }
    if (init?.headers && (init.headers as Record<string, string>)["Content-Length"] === "0") {
      return Response.json({ id: videoId });
    }
    return new Response(null, { status: 308 });
  }) as typeof fetch;
}

async function seedLargeObjectS3Video(organizationId: string, creativeProjectId: string) {
  const blobStore = createMemoryCreativeBlobStore();
  setCreativeBlobStoreForTests(blobStore);
  const store = createMemoryCreativeAssetStore();
  setCreativeAssetStoreForTests(store);
  const bytes = new Uint8Array(ASYNC_THRESHOLD);
  bytes.fill(9);
  await store.put({
    organizationId,
    creativeProjectId,
    assetId: "casset_phase650_primary",
    mimeType: "video/mp4",
    bytes,
    durationMs: 15000,
    modality: "video",
    providerId: "openai",
    providerAssetId: "prov_650",
  });
}

async function seedYouTubeCredential(actor: Actor) {
  await upsertSocialCredentialForActor(actor, "youtube", {
    tokens: { accessToken: "yt_access_token", refreshToken: "yt_refresh" },
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    externalAccountId: "channel_650",
    externalAccountName: "Test Channel",
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
  });
}

describe("Phase 65.0 async YouTube publish foundation", () => {
  const envBackup: Record<string, string | undefined> = {};
  const persistedStates = new Map<string, AgentsPersistedState>();

  beforeEach(() => {
    vi.restoreAllMocks();
    persistedStates.clear();
    actorMocks.actor = actorFor(ORG_A);
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    setYouTubeUploadSessionStoreForTests(null);
    setYouTubeResumableDepsForTests(null);
    setYouTubeUploadDepsForTests(null);
    setPersistPublishResultForTests(async (actor, state) => {
      persistedStates.set(actor.organizationId, state);
      return state;
    });
    vi.spyOn(agentsPersistence, "getAgentOsStateForActor").mockImplementation(
      async (actor) => {
        const state = persistedStates.get(actor.organizationId);
        if (!state) {
          throw new Error(`missing_state:${actor.organizationId}`);
        }
        return state;
      },
    );
    vi.spyOn(agentsPersistence, "putAgentOsStateForActor").mockImplementation(
      async (actor, state) => {
        persistedStates.set(actor.organizationId, state);
        return state;
      },
    );
    persistedStates.set(ORG_A, publishState(ORG_A));

    for (const key of [
      "AGXORA_YOUTUBE_PUBLISH_ENABLED",
      "AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED",
      "AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES",
      "AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN",
      "AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS",
      "AGXORA_YOUTUBE_UPLOAD_SESSION_LEASE_MS",
      "AGXORA_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN",
      "AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY",
    ]) {
      envBackup[key] = process.env[key];
    }

    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES = String(10 * 1024 * 1024);
    process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN = "worker_secret_phase650";
    process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
    process.env.AGXORA_YOUTUBE_UPLOAD_SESSION_LEASE_MS = "1000";
    setYouTubeResumableDepsForTests({
      now: () => Date.now(),
      fetch: youtubeFetchMock(),
    });
    setYouTubeUploadDepsForTests({
      now: () => Date.now(),
      fetch: youtubeFetchMock(),
    });
  });

  afterEach(() => {
    actorMocks.actor = null;
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    setYouTubeUploadSessionStoreForTests(null);
    setYouTubeResumableDepsForTests(null);
    setYouTubeUploadDepsForTests(null);
    setPersistPublishResultForTests(null);
    setCreativeAssetStoreForTests(null);
    setCreativeBlobStoreForTests(null);
    vi.restoreAllMocks();
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("detects async eligibility for large object_s3 videos", async () => {
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    const asset = await getCreativeAssetStore().getPrimary({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase650",
    });
    expect(asset).not.toBeNull();
    expect(
      isAsyncYouTubePublishEligible({
        target: {
          socialPlatform: "youtube",
          contentType: "video",
          adapterAction: "publishPost",
        },
        asset: asset!,
      }),
    ).toBe(true);
  });

  it("uses synchronous path when async feature flag is off", async () => {
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "false";
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish").mockResolvedValue({
      available: true,
      status: "published",
      published: true,
      externalId: "sync_video_650",
    });
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    expect(result.publishResult.published).toBe(true);
    expect(result.publishResult.status).toBe("published");
    expect(spy).toHaveBeenCalled();
  });

  it("creates upload session and returns uploading publishResult", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    expect(result.publishResult.status).toBe("uploading");
    expect(result.publishResult.published).toBe(false);
    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_650");
    expect(attempt?.status).toBe("uploading");
    expect(persistedStates.get(ORG_A)?.creativeProjects[0]?.publishResult?.status).toBe(
      "uploading",
    );
  });

  it("stores encrypted resumable URL without plaintext leakage", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_650");
    expect(attempt).not.toBeNull();
    const sessions = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "claim_enc" });
    expect(sessions.length).toBe(1);
    const encryptedUrl = getEncryptedUploadUrlForTests(sessions[0]!.id);
    expect(encryptedUrl).toBeTruthy();
    expect(encryptedUrl).not.toContain("https://upload.example");
    expect(JSON.stringify(persistedStates.get(ORG_A))).not.toContain("upload.example");
    expect(JSON.stringify(buildHealthPayload())).not.toContain("worker_secret_phase650");
  });

  it("rejects worker without bearer token", () => {
    expect(() => assertCreativePublishWorkerAuthorized(null)).toThrow("worker_unauthorized");
  });

  it("authenticates worker with constant-time token compare", async () => {
    expect(() =>
      assertCreativePublishWorkerAuthorized("Bearer worker_secret_phase650"),
    ).not.toThrow();
    expect(() =>
      assertCreativePublishWorkerAuthorized("Bearer wrong_token_value"),
    ).toThrow("worker_unauthorized");
    const response = await workerRoutePost(
      new Request("https://app.example/api/v1/internal/creative/publish/worker", {
        method: "POST",
        headers: { Authorization: "Bearer wrong_token_value" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects publish status for cross-org job binding", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await expect(
      getCreativePublishStatusForActor(actorFor(ORG_B), {
        creativeProjectId: "creative_phase650",
        publishExecutionJobId: "publish_job_650",
      }),
    ).rejects.toThrow(/missing_state|not_found|forbidden/);
  });

  it("claims sessions exclusively under concurrency", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const first = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "worker_a" });
    const second = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "worker_b" });
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it("reclaims session after lease expiry", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const claimed = await claimDueYouTubeUploadSessions({
      limit: 1,
      claimId: "lease_worker",
      now: new Date(),
    });
    expect(claimed).toHaveLength(1);
    const reclaimed = await claimDueYouTubeUploadSessions({
      limit: 1,
      claimId: "lease_worker_2",
      now: new Date(Date.now() + 2000),
    });
    expect(reclaimed).toHaveLength(1);
  });

  it("persists byte offset during worker upload", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "offset_worker" });
    await updateYouTubeUploadSessionProgress({
      sessionId: session!.id,
      organizationId: ORG_A,
      byteOffset: 512_000,
      status: "uploading",
    });
    const refreshed = await claimDueYouTubeUploadSessions({
      limit: 1,
      claimId: "offset_worker_2",
      now: new Date(Date.now() + 2000),
    });
    expect(refreshed[0]?.byteOffset).toBe(512_000);
  });

  it("resumes interrupted upload and completes with externalId", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "resume_worker" });
    await updateYouTubeUploadSessionProgress({
      sessionId: session!.id,
      organizationId: ORG_A,
      byteOffset: 1_048_576,
      status: "uploading",
    });
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("completed");
    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_650");
    expect(attempt?.status).toBe("succeeded");
    expect(attempt?.externalId).toBe("video_phase650");
    expect(persistedStates.get(ORG_A)?.creativeProjects[0]?.publishResult?.published).toBe(true);
  });

  it("refreshes credentials during worker execution when expired", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(youtubeFetchMock());
    const actor = actorFor(ORG_A);
    await upsertSocialCredentialForActor(actor, "youtube", {
      tokens: { accessToken: "expired", refreshToken: "yt_refresh" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      accessTokenExpiresAt: new Date(Date.now() - 60_000),
    });
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    const lock = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_650",
      creativeProjectId: "creative_phase650",
      assetId: "casset_phase650_primary",
      platform: "youtube",
    });
    expect(lock.kind).toBe("acquired");
    const attemptId = lock.kind === "acquired" ? lock.attemptId : "";
    const asset = await getCreativeAssetStore().getPrimary({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase650",
    });
    await createYouTubeUploadSession({
      organizationId: ORG_A,
      publishAttemptId: attemptId,
      publishExecutionJobId: "publish_job_650",
      creativeProjectId: "creative_phase650",
      assetId: "casset_phase650_primary",
      objectKey: asset!.objectKey!,
      actorUserId: USER_A,
      mimeType: "video/mp4",
      byteSize: ASYNC_THRESHOLD,
      resumableUploadUrl: "https://upload.example/resumable/phase650",
    });
    await completeCreativePublishAttempt({
      attemptId,
      organizationId: ORG_A,
      status: "uploading",
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        executionJobId: "publish_job_650",
      },
    });
    const [claimed] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "refresh_worker" });
    const outcome = await processYouTubeUploadSession(claimed!);
    expect(outcome).toBe("completed");
  });

  it("marks terminal failure without published=true", async () => {
    setYouTubeResumableDepsForTests({
      now: () => Date.now(),
      fetch: vi.fn(async () => new Response("fail", { status: 500 })) as typeof fetch,
    });
    setYouTubeUploadDepsForTests({
      now: () => Date.now(),
      fetch: vi.fn(async () => new Response("fail", { status: 500 })) as typeof fetch,
    });
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    const lock = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_650",
      creativeProjectId: "creative_phase650",
      assetId: "casset_phase650_primary",
      platform: "youtube",
    });
    expect(lock.kind).toBe("acquired");
    const attemptId = lock.kind === "acquired" ? lock.attemptId : "";
    const asset = await getCreativeAssetStore().getPrimary({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase650",
    });
    await createYouTubeUploadSession({
      organizationId: ORG_A,
      publishAttemptId: attemptId,
      publishExecutionJobId: "publish_job_650",
      creativeProjectId: "creative_phase650",
      assetId: "casset_phase650_primary",
      objectKey: asset!.objectKey!,
      actorUserId: USER_A,
      mimeType: "video/mp4",
      byteSize: ASYNC_THRESHOLD,
      resumableUploadUrl: "https://upload.example/resumable/phase650",
    });
    await completeCreativePublishAttempt({
      attemptId,
      organizationId: ORG_A,
      status: "uploading",
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        executionJobId: "publish_job_650",
      },
    });
    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "fail_worker" });
    expect(session).toBeDefined();
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("failed");
    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_650");
    expect(attempt?.status).toBe("failed");
    expect(attempt?.publishResult?.published).toBe(false);
  });

  it("replays uploading attempt without duplicate session creation", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    const first = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const second = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    expect(first.publishResult.status).toBe("uploading");
    expect(second.idempotentReplay).toBe(true);
    expect(second.publishResult.status).toBe("uploading");
  });

  it("exposes actor-scoped publish status endpoint", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const response = await publishStatusRouteGet(
      new Request(
        "https://app.example/api/v1/agents/creative/publish/status?creativeProjectId=creative_phase650&publishExecutionJobId=publish_job_650",
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      publishResult?: { status?: string };
      uploadSession?: { status?: string };
    };
    expect(body.publishResult?.status).toBe("uploading");
    expect(body.uploadSession?.status).toBe("pending");
    expect(JSON.stringify(body)).not.toContain("upload.example");
  });

  it("reports worker readiness issue when async enabled without token", () => {
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "true";
    delete process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN;
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
    process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    process.env.AGXORA_CREATIVE_BLOB_STORE = "s3";
    process.env.AGXORA_CREATIVE_BLOB_S3_BUCKET = "bucket";
    process.env.AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID = "key";
    process.env.AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY = "secret";
    const readiness = evaluateYouTubePublishReadiness();
    expect(readiness.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["creative_publish_worker_not_configured"]),
    );
  });

  it("runs worker route and completes lifecycle uploading to published", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishRoutePost(
      new Request("https://app.example/api/v1/agents/creative/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeProjectId: "creative_phase650" }),
      }),
    );
    const workerResponse = await workerRoutePost(
      new Request("https://app.example/api/v1/internal/creative/publish/worker", {
        method: "POST",
        headers: {
          Authorization: "Bearer worker_secret_phase650",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(workerResponse.status).toBe(200);
    const workerBody = (await workerResponse.json()) as { summary?: { completed?: number } };
    expect(workerBody.summary?.completed).toBeGreaterThanOrEqual(1);
    expect(persistedStates.get(ORG_A)?.creativeProjects[0]?.publishResult?.published).toBe(true);
    expect(persistedStates.get(ORG_A)?.creativeProjects[0]?.publishResult?.externalId).toBe(
      "video_phase650",
    );
  });

  it("phase 57 production gate remains unchanged", () => {
    const gate = evaluateFirstCustomerProductionGate({
      nodeEnv: "production",
      agxoraEnv: "production",
      authRequired: true,
      authMode: "server",
      crmPersistence: "database",
      agentOsPersistence: "server",
      emailProvider: "resend",
      useMocks: false,
    });
    expect(gate.ready).toBe(true);
  });

  it("phase 63.0 rejects client media overrides", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase650",
        oauthToken: "client_token",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("phase 63.1 sync publish path still works for small videos", async () => {
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "false";
    setCreativeBlobStoreForTests(createMemoryCreativeBlobStore());
    const store = createMemoryCreativeAssetStore();
    setCreativeAssetStoreForTests(store);
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase650",
      assetId: "casset_phase650_primary",
      mimeType: "video/mp4",
      bytes: new Uint8Array(1024),
      durationMs: 15000,
      modality: "video",
      providerId: "openai",
      providerAssetId: "prov_650",
    });
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedYouTubeCredential(actorFor(ORG_A));
    vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish").mockResolvedValue({
      available: true,
      status: "published",
      published: true,
      externalId: "video_631_regression",
    });
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    expect(result.publishResult.published).toBe(true);
  });

  it("phase 64.0 readiness remains coherent when async disabled", () => {
    delete process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED;
    delete process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN;
    const readiness = evaluateYouTubePublishReadiness();
    expect(readiness.enabled).toBe(true);
    expect(readiness.issues.map((issue) => issue.code)).not.toContain(
      "creative_publish_worker_not_configured",
    );
  });

  it("phase 64.0 incremental sync upload still maps errors honestly", async () => {
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "false";
    setYouTubeUploadDepsForTests({
      now: () => Date.now(),
      fetch: vi.fn(async () => new Response("fail", { status: 500 })) as typeof fetch,
    });
    const result = await publishCreativeToYouTube({
      project: youtubeVideoProject(ORG_A),
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
    expect(result.published).toBe(false);
    expect(result.status).toBe("failed");
  });

  it("worker batch run returns summary without leaking secrets", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase650");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase650",
    });
    const summary = await runCreativePublishWorker(5);
    expect(summary.processed).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(summary)).not.toContain("worker_secret_phase650");
    expect(JSON.stringify(summary)).not.toContain("upload.example");
  });
});
