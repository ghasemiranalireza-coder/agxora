/**
 * Phase 67.0 — async publish lifecycle completion & terminal reconciliation tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval, AgentTask } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  publishCreativeForActor,
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
import {
  acquireCreativePublishAttempt,
  completeCreativePublishAttempt,
  getCreativePublishAttemptByJobId,
  setPublishAttemptStoreForTests,
} from "@/app/lib/creative/publishIdempotency";
import { setPersistPublishResultForTests } from "@/app/lib/creative/persistPublishResult";
import { upsertSocialCredentialForActor } from "@/app/lib/social/credentials";
import * as socialCredentials from "@/app/lib/social/credentials";
import { setYouTubeResumableDepsForTests } from "@/app/lib/social/adapters/youtubeResumable";
import { setYouTubeUploadDepsForTests } from "@/app/lib/social/adapters/youtubePublish";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import {
  claimDueYouTubeUploadSessions,
  createYouTubeUploadSession,
  expireStaleYouTubeUploadSessions,
  findYouTubeUploadSessionByPublishJob,
  getEncryptedUploadUrlForTests,
  setYouTubeUploadSessionStoreForTests,
} from "@/app/lib/creative/youtubeUploadSession";
import {
  processYouTubeUploadSession,
  runCreativePublishWorker,
} from "@/app/lib/creative/publishWorker";
import {
  reconcileExpiredYouTubeUploadSessions,
} from "@/app/lib/creative/reconcilePublishLifecycle";
import { getCreativePublishStatusForActor } from "@/app/lib/creative/publishStatus";
import { GET as statusRouteGet } from "@/app/api/v1/agents/creative/publish/status/route";
import { authorizeCreativePublishFromState } from "@/app/lib/creative/authorizePublish";
import { getCreativeAssetStore } from "@/app/lib/creative/assetStore";
import * as agentsPersistence from "@/app/lib/agents/persistence";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASYNC_THRESHOLD = 12 * 1024 * 1024;

function actorFor(organizationId: string, userId = USER_A): Actor {
  return {
    userId,
    email: "phase670@example.com",
    name: "Phase 670",
    organizationId,
    workspaceId: "ws_phase670",
    membershipId: "mem_phase670",
    role: "OWNER",
    sessionToken: "session_phase670",
  };
}

function youtubeVideoProject(organizationId: string): CreativeProject {
  const assetId = "casset_phase670_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase670", assetId);
  return {
    id: "creative_phase670",
    organizationId,
    profileId: "profile_1",
    name: "Phase 67 YouTube",
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
    publishExecutionJobId: "publish_job_670",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  };
}

function publishState(organizationId: string): AgentsPersistedState {
  const project = youtubeVideoProject(organizationId);
  const approval: AgentApproval = {
    id: "publish_approval_670",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_670",
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
    id: "publish_job_670",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_publish",
    title: "Publish",
    status: "VERIFYING",
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
    taskId: "task_publish_670",
    params: { creativeId: project.id, growthAction: "creative_publish" },
  };
  const task: AgentTask = {
    id: "task_publish_670",
    organizationId,
    agentInstanceId: "agent_1",
    title: "Publish creative",
    status: "completed",
    priority: 1,
    input: { creativeId: project.id, growthAction: "creative_publish" },
    attempt: 1,
    maxAttempts: 1,
    createdAt: "2026-08-28T00:00:00.000Z",
  };
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    tasks: [task],
    socialAccounts: [
      {
        id: "sacc_670",
        organizationId,
        platform: "youtube",
        state: "CONNECTED",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
    ],
    campaigns: [],
    growthProfiles: [],
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

function youtubeFetchMock(videoId = "video_phase670"): typeof fetch {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("uploadType=resumable")) {
      return new Response(null, {
        status: 200,
        headers: { Location: "https://upload.example/resumable/phase670" },
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
    assetId: "casset_phase670_primary",
    mimeType: "video/mp4",
    bytes,
    durationMs: 15000,
    modality: "video",
    providerId: "openai",
    providerAssetId: "prov_670",
  });
}

async function seedYouTubeCredential(actor: Actor) {
  await upsertSocialCredentialForActor(actor, "youtube", {
    tokens: { accessToken: "yt_access_token", refreshToken: "yt_refresh" },
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    externalAccountId: "channel_670",
    externalAccountName: "Test Channel",
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
  });
}

async function seedUploadingPublishState() {
  process.env.AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS = "1";
  const state = publishState(ORG_A);
  persistedStates.set(ORG_A, state);
  setCreativePublishLoadStateForTests(async () => persistedStates.get(ORG_A) ?? state);
  await seedLargeObjectS3Video(ORG_A, "creative_phase670");
  await seedYouTubeCredential(actorFor(ORG_A));
  await publishCreativeForActor(actorFor(ORG_A), {
    creativeProjectId: "creative_phase670",
  });
}

async function expireActiveUploadSession() {
  await new Promise((resolve) => setTimeout(resolve, 5));
  const expiredCount = await expireStaleYouTubeUploadSessions();
  expect(expiredCount).toBeGreaterThanOrEqual(1);
}

let persistedStates: Map<string, AgentsPersistedState>;

describe("Phase 67.0 publish lifecycle terminal reconciliation", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    persistedStates = new Map();
    agentsStore.clearMemory();
    setAgentsRepository(new MemoryAgentsRepository());
    actorMocks.actor = actorFor(ORG_A);
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
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
        if (!state) throw new Error(`missing_state:${actor.organizationId}`);
        return state;
      },
    );
    vi.spyOn(agentsPersistence, "putAgentOsStateForActor").mockImplementation(
      async (actor, state) => {
        persistedStates.set(actor.organizationId, state);
        return state;
      },
    );

    for (const key of [
      "AGXORA_YOUTUBE_PUBLISH_ENABLED",
      "AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED",
      "AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES",
      "AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN",
      "AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED",
      "AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS",
      "AGXORA_YOUTUBE_UPLOAD_SESSION_LEASE_MS",
      "AGXORA_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN",
      "AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN",
      "AGXORA_YOUTUBE_WORKER_MAX_WALL_CLOCK_MS_PER_RUN",
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
    process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN = "worker_secret_phase670";
    process.env.AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN = "1";
    process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
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

  it("terminal-fails expired upload sessions and persists publishResult", async () => {
    await seedUploadingPublishState();
    await expireActiveUploadSession();

    const reconciled = await reconcileExpiredYouTubeUploadSessions(10);
    expect(reconciled).toBeGreaterThanOrEqual(1);

    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_670");
    expect(attempt?.status).toBe("failed");
    expect(attempt?.publishResult?.status).toBe("failed");
    expect(attempt?.publishResult?.reason).toBe("youtube_upload_session_expired");
    expect(attempt?.publishResult?.published).toBe(false);

    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.creativeProjects[0]?.publishResult?.status).toBe("failed");
    expect(persisted?.creativeProjects[0]?.publishResult?.reason).toBe(
      "youtube_upload_session_expired",
    );
  });

  it("persists Operations job.result when expired session is reconciled", async () => {
    await seedUploadingPublishState();
    await expireActiveUploadSession();
    await reconcileExpiredYouTubeUploadSessions(10);

    const job = persistedStates.get(ORG_A)?.executionJobs[0];
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.status).toBe("failed");
    expect(job?.result?.message).toBe("youtube_upload_session_expired");
    expect(job?.result?.success).toBe(false);
  });

  it("status endpoint does not report uploading after session expiration", async () => {
    await seedUploadingPublishState();
    await expireActiveUploadSession();

    const status = await getCreativePublishStatusForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase670",
      publishExecutionJobId: "publish_job_670",
    });

    expect(status.publishResult.status).toBe("failed");
    expect(status.publishResult.reason).toBe("youtube_upload_session_expired");
    expect(status.publishResult.status).not.toBe("uploading");
    expect(status.uploadSession?.status).toBe("expired");

    const routeResponse = await statusRouteGet(
      new Request(
        "https://app.example/api/v1/agents/creative/publish/status?creativeProjectId=creative_phase670&publishExecutionJobId=publish_job_670",
      ),
    );
    const body = (await routeResponse.json()) as {
      publishResult?: { status?: string; reason?: string };
      uploadSession?: { status?: string };
    };
    expect(body.publishResult?.status).toBe("failed");
    expect(body.publishResult?.reason).toBe("youtube_upload_session_expired");
    expect(JSON.stringify(body)).not.toContain("upload.example/resumable");
  });

  it("repeated reconciliation is idempotent", async () => {
    await seedUploadingPublishState();
    await expireActiveUploadSession();

    const first = await reconcileExpiredYouTubeUploadSessions(10);
    expect(first).toBeGreaterThanOrEqual(1);
    const second = await reconcileExpiredYouTubeUploadSessions(10);
    expect(second).toBe(0);

    const summary = await runCreativePublishWorker(5);
    expect(summary.reconciled).toBe(0);
  });

  it("asset unavailable worker path persists terminal state", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase670");
    await seedYouTubeCredential(actorFor(ORG_A));

    const lock = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_670",
      creativeProjectId: "creative_phase670",
      assetId: "casset_phase670_primary",
      platform: "youtube",
    });
    const attemptId = lock.kind === "acquired" ? lock.attemptId : "";
    const asset = await getCreativeAssetStore().getPrimary({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase670",
    });
    await createYouTubeUploadSession({
      organizationId: ORG_A,
      publishAttemptId: attemptId,
      publishExecutionJobId: "publish_job_670",
      creativeProjectId: "creative_phase670",
      assetId: "casset_phase670_primary",
      objectKey: asset!.objectKey!,
      actorUserId: USER_A,
      mimeType: "video/mp4",
      byteSize: ASYNC_THRESHOLD,
      resumableUploadUrl: "https://upload.example/resumable/phase670",
    });
    await completeCreativePublishAttempt({
      attemptId,
      organizationId: ORG_A,
      status: "uploading",
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        executionJobId: "publish_job_670",
      },
    });

    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "asset_missing" });
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("failed");

    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.creativeProjects[0]?.publishResult?.status).toBe("failed");
    expect(persisted?.creativeProjects[0]?.publishResult?.reason).toBe("asset_storage_unavailable");
    expect(persisted?.executionJobs[0]?.status).toBe("FAILED");
    expect(persisted?.executionJobs[0]?.result?.message).toBe("asset_storage_unavailable");
  });

  it("token refresh failure persists terminal state", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase670");
    vi.spyOn(socialCredentials, "getValidSocialAccessTokenForActor").mockResolvedValue(null);

    const lock = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_670",
      creativeProjectId: "creative_phase670",
      assetId: "casset_phase670_primary",
      platform: "youtube",
    });
    const attemptId = lock.kind === "acquired" ? lock.attemptId : "";
    const asset = await getCreativeAssetStore().getPrimary({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase670",
    });
    await createYouTubeUploadSession({
      organizationId: ORG_A,
      publishAttemptId: attemptId,
      publishExecutionJobId: "publish_job_670",
      creativeProjectId: "creative_phase670",
      assetId: "casset_phase670_primary",
      objectKey: asset!.objectKey!,
      actorUserId: USER_A,
      mimeType: "video/mp4",
      byteSize: ASYNC_THRESHOLD,
      resumableUploadUrl: "https://upload.example/resumable/phase670",
    });
    await completeCreativePublishAttempt({
      attemptId,
      organizationId: ORG_A,
      status: "uploading",
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        executionJobId: "publish_job_670",
      },
    });

    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "token_fail" });
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("failed");

    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.creativeProjects[0]?.publishResult?.reason).toBe("social_token_refresh_failed");
    expect(persisted?.executionJobs[0]?.result?.message).toBe("social_token_refresh_failed");
  });

  it("adapter failure persists terminal state and job.result", async () => {
    setYouTubeUploadDepsForTests({
      now: () => Date.now(),
      fetch: vi.fn(async () => new Response("fail", { status: 500 })) as typeof fetch,
    });
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase670");
    await seedYouTubeCredential(actorFor(ORG_A));

    const lock = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_670",
      creativeProjectId: "creative_phase670",
      assetId: "casset_phase670_primary",
      platform: "youtube",
    });
    const attemptId = lock.kind === "acquired" ? lock.attemptId : "";
    const asset = await getCreativeAssetStore().getPrimary({
      organizationId: ORG_A,
      creativeProjectId: "creative_phase670",
    });
    await createYouTubeUploadSession({
      organizationId: ORG_A,
      publishAttemptId: attemptId,
      publishExecutionJobId: "publish_job_670",
      creativeProjectId: "creative_phase670",
      assetId: "casset_phase670_primary",
      objectKey: asset!.objectKey!,
      actorUserId: USER_A,
      mimeType: "video/mp4",
      byteSize: ASYNC_THRESHOLD,
      resumableUploadUrl: "https://upload.example/resumable/phase670",
    });
    await completeCreativePublishAttempt({
      attemptId,
      organizationId: ORG_A,
      status: "uploading",
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        executionJobId: "publish_job_670",
      },
    });

    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "adapter_fail" });
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("failed");

    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.executionJobs[0]?.status).toBe("FAILED");
    expect(persisted?.executionJobs[0]?.result?.status).toBe("failed");
    expect(persisted?.creativeProjects[0]?.publishResult?.published).toBe(false);
  });

  it("success persists job.result with completed status", async () => {
    process.env.AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN = "100";
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase670");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase670",
    });

    const summary = await runCreativePublishWorker(1);
    expect(summary.completed).toBeGreaterThanOrEqual(1);

    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.creativeProjects[0]?.publishResult?.published).toBe(true);
    expect(persisted?.executionJobs[0]?.status).toBe("COMPLETED");
    expect(persisted?.executionJobs[0]?.result?.status).toBe("completed");
    expect(persisted?.executionJobs[0]?.result?.success).toBe(true);
  });

  it("partial upload budget remains uploading", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase670");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase670",
    });
    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "partial_670" });
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("partial");

    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_670");
    expect(attempt?.status).toBe("uploading");
    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.executionJobs[0]?.status).not.toBe("FAILED");
  });

  it("does not leak encrypted resumable URLs in status or worker summary paths", async () => {
    await seedUploadingPublishState();
    const session = await findYouTubeUploadSessionByPublishJob(ORG_A, "publish_job_670");
    expect(session).toBeDefined();
    expect(getEncryptedUploadUrlForTests(session!.id)).toBeTruthy();

    const status = await getCreativePublishStatusForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase670",
      publishExecutionJobId: "publish_job_670",
    });
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("upload.example/resumable");
    expect(serialized).not.toContain("encrypted");
  });

  it("phase 63 authorization still rejects missing approval binding", () => {
    const state = publishState(ORG_A);
    const broken: AgentsPersistedState = {
      ...state,
      creativeProjects: [
        {
          ...state.creativeProjects[0]!,
          publishExecutionJobId: undefined,
        },
      ],
    };
    expect(() =>
      authorizeCreativePublishFromState(broken, ORG_A, "creative_phase670"),
    ).toThrow();
  });

  it("phase 57 production gate remains unchanged", () => {
    expect(evaluateFirstCustomerProductionGate()).toMatchObject({
      enforced: expect.any(Boolean),
      ready: expect.any(Boolean),
    });
  });
});
