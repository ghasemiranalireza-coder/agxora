/**
 * Phase 66.0 — async publish operations completion & worker scheduling tests.
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
  getCreativePublishAttemptByJobId,
  setPublishAttemptStoreForTests,
} from "@/app/lib/creative/publishIdempotency";
import { setPersistPublishResultForTests } from "@/app/lib/creative/persistPublishResult";
import { upsertSocialCredentialForActor } from "@/app/lib/social/credentials";
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
  claimDueYouTubeUploadSessions,
  setYouTubeUploadSessionStoreForTests,
} from "@/app/lib/creative/youtubeUploadSession";
import {
  processYouTubeUploadSession,
  runCreativePublishWorker,
} from "@/app/lib/creative/publishWorker";
import {
  assertCreativePublishWorkerAuthorized,
  isCreativePublishSchedulerConfigured,
} from "@/app/lib/creative/publishWorkerAuth";
import { GET as workerRouteGet, POST as workerRoutePost } from "@/app/api/v1/internal/creative/publish/worker/route";
import { POST as publishRoutePost } from "@/app/api/v1/agents/creative/publish/route";
import * as agentsPersistence from "@/app/lib/agents/persistence";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { operationsService } from "@/features/agents/execution/service";
import { creativeService } from "@/features/agents/creative/service";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASYNC_THRESHOLD = 12 * 1024 * 1024;

function actorFor(organizationId: string, userId = USER_A): Actor {
  return {
    userId,
    email: "phase660@example.com",
    name: "Phase 660",
    organizationId,
    workspaceId: "ws_phase660",
    membershipId: "mem_phase660",
    role: "OWNER",
    sessionToken: "session_phase660",
  };
}

function youtubeVideoProject(organizationId: string): CreativeProject {
  const assetId = "casset_phase660_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase660", assetId);
  return {
    id: "creative_phase660",
    organizationId,
    profileId: "profile_1",
    name: "Phase 66 YouTube",
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
    publishExecutionJobId: "publish_job_660",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  };
}

function publishState(organizationId: string): AgentsPersistedState {
  const project = youtubeVideoProject(organizationId);
  const approval: AgentApproval = {
    id: "publish_approval_660",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_660",
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
    id: "publish_job_660",
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
    taskId: "task_publish_660",
    params: { creativeId: project.id, growthAction: "creative_publish" },
  };
  const task: AgentTask = {
    id: "task_publish_660",
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
        id: "sacc_660",
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

function youtubeFetchMock(videoId = "video_phase660"): typeof fetch {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("uploadType=resumable")) {
      return new Response(null, {
        status: 200,
        headers: { Location: "https://upload.example/resumable/phase660" },
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
    assetId: "casset_phase660_primary",
    mimeType: "video/mp4",
    bytes,
    durationMs: 15000,
    modality: "video",
    providerId: "openai",
    providerAssetId: "prov_660",
  });
}

async function seedYouTubeCredential(actor: Actor) {
  await upsertSocialCredentialForActor(actor, "youtube", {
    tokens: { accessToken: "yt_access_token", refreshToken: "yt_refresh" },
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    externalAccountId: "channel_660",
    externalAccountName: "Test Channel",
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
  });
}

describe("Phase 66.0 async publish operations completion", () => {
  const envBackup: Record<string, string | undefined> = {};
  const persistedStates = new Map<string, AgentsPersistedState>();

  beforeEach(() => {
    vi.restoreAllMocks();
    persistedStates.clear();
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
      "CRON_SECRET",
    ]) {
      envBackup[key] = process.env[key];
    }

    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES = String(10 * 1024 * 1024);
    process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN = "worker_secret_phase660";
    process.env.AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN = "1";
    process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 6).toString("base64");
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

  it("returns partial worker progress without terminal failure", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase660");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase660",
    });
    const [session] = await claimDueYouTubeUploadSessions({ limit: 1, claimId: "partial_worker" });
    expect(session).toBeDefined();
    const outcome = await processYouTubeUploadSession(session!);
    expect(outcome).toBe("partial");
    const attempt = await getCreativePublishAttemptByJobId(ORG_A, "publish_job_660");
    expect(attempt?.status).toBe("uploading");
    expect(attempt?.publishResult?.published).toBe(false);
    expect(attempt?.publishResult?.status).toBe("uploading");
  });

  it("aggregates partial worker runs in summary", async () => {
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase660");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase660",
    });
    const summary = await runCreativePublishWorker(1);
    expect(summary.partial).toBeGreaterThanOrEqual(1);
    expect(summary.failed).toBe(0);
  });

  it("completes upload across bounded worker invocations", async () => {
    process.env.AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN = "100";
    const state = publishState(ORG_A);
    persistedStates.set(ORG_A, state);
    setCreativePublishLoadStateForTests(async () => state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase660");
    await seedYouTubeCredential(actorFor(ORG_A));
    await publishRoutePost(
      new Request("https://app.example/api/v1/agents/creative/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeProjectId: "creative_phase660" }),
      }),
    );
    const first = await runCreativePublishWorker(1);
    if (first.completed === 0) {
      const second = await runCreativePublishWorker(1);
      expect(second.completed + first.completed).toBeGreaterThanOrEqual(1);
    } else {
      expect(first.completed).toBeGreaterThanOrEqual(1);
    }
    expect(persistedStates.get(ORG_A)?.creativeProjects[0]?.publishResult?.published).toBe(true);
  });

  it("keeps Operations job VERIFYING while publish is uploading", () => {
    const state = publishState(ORG_A);
    const uploadingState: AgentsPersistedState = {
      ...state,
      creativeProjects: [
        {
          ...state.creativeProjects[0]!,
          publishResult: {
            available: true,
            status: "uploading",
            published: false,
            reason: "youtube_upload_in_progress",
            platform: "youtube",
            executionJobId: "publish_job_660",
          },
        },
      ],
      executionJobs: [
        {
          ...state.executionJobs[0]!,
          status: "VERIFYING",
        },
      ],
    };
    for (const item of uploadingState.creativeProjects) {
      agentsStore.upsertCreativeProject(item);
    }
    for (const item of uploadingState.executionJobs) {
      agentsStore.upsertExecutionJob(item);
    }
    for (const item of uploadingState.tasks) {
      agentsStore.upsertTask(item);
    }
    const reconciled = operationsService.reconcileCreativePublishResult(
      ORG_A,
      "publish_job_660",
    );
    expect(reconciled?.status).toBe("VERIFYING");
    expect(reconciled?.result?.status).toBe("in_progress");
    expect(reconciled?.status).not.toBe("FAILED");
  });

  it("reconciles Operations job to COMPLETED after publish succeeds", () => {
    const state = publishState(ORG_A);
    const publishedState: AgentsPersistedState = {
      ...state,
      creativeProjects: [
        {
          ...state.creativeProjects[0]!,
          publishResult: {
            available: true,
            status: "published",
            published: true,
            reason: "published",
            platform: "youtube",
            externalId: "video_phase660",
            executionJobId: "publish_job_660",
          },
        },
      ],
      executionJobs: [
        {
          ...state.executionJobs[0]!,
          status: "VERIFYING",
        },
      ],
    };
    for (const item of publishedState.creativeProjects) {
      agentsStore.upsertCreativeProject(item);
    }
    for (const item of publishedState.executionJobs) {
      agentsStore.upsertExecutionJob(item);
    }
    for (const item of publishedState.tasks) {
      agentsStore.upsertTask(item);
    }
    const reconciled = operationsService.reconcileCreativePublishResult(
      ORG_A,
      "publish_job_660",
    );
    expect(reconciled?.status).toBe("COMPLETED");
    expect(reconciled?.result?.success).toBe(true);
  });

  it("polls publish status until terminal result in creativeService", async () => {
    vi.useFakeTimers();
    const project = youtubeVideoProject(ORG_A);
    agentsStore.upsertCreativeProject(project);
    await seedLargeObjectS3Video(ORG_A, project.id);
    await seedYouTubeCredential(actorFor(ORG_A));

    let statusPolls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/v1/agents/creative/publish/status")) {
        statusPolls += 1;
        if (statusPolls < 2) {
          return Response.json({
            ok: true,
            organizationId: ORG_A,
            publishResult: {
              available: true,
              status: "uploading",
              published: false,
              reason: "youtube_upload_in_progress",
              executionJobId: "publish_job_660",
            },
            uploadSession: { byteOffset: 262144, byteSize: ASYNC_THRESHOLD },
          });
        }
        return Response.json({
          ok: true,
          organizationId: ORG_A,
          publishResult: {
            available: true,
            status: "published",
            published: true,
            reason: "published",
            platform: "youtube",
            externalId: "video_phase660_poll",
            executionJobId: "publish_job_660",
          },
        });
      }
      if (url.includes("/api/v1/agents/creative/publish") && init?.method === "POST") {
        return Response.json({
          ok: true,
          organizationId: ORG_A,
          publishResult: {
            available: true,
            status: "uploading",
            published: false,
            reason: "youtube_upload_in_progress",
            executionJobId: "publish_job_660",
          },
        });
      }
      throw new Error(`unexpected_fetch:${url}`);
    });

    const pollPromise = creativeService.runServerProviderPublish(ORG_A, project.id, project);
    await vi.runAllTimersAsync();
    const applied = await pollPromise;
    expect(statusPolls).toBeGreaterThanOrEqual(2);
    expect(applied.publishResult?.published).toBe(true);
    expect(applied.publishResult?.externalId).toBe("video_phase660_poll");
    vi.useRealTimers();
  });

  it("reports scheduler readiness issue when async enabled without scheduler flag", () => {
    process.env.AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED = "false";
    process.env.AGXORA_CREATIVE_BLOB_STORE = "s3";
    process.env.AGXORA_CREATIVE_BLOB_S3_BUCKET = "bucket";
    process.env.AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID = "key";
    process.env.AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY = "secret";
    expect(isCreativePublishSchedulerConfigured()).toBe(false);
    const readiness = evaluateYouTubePublishReadiness();
    expect(readiness.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["creative_publish_scheduler_not_configured"]),
    );
    expect(JSON.stringify(buildHealthPayload())).toContain(
      "creative_publish_scheduler_not_configured",
    );
  });

  it("accepts Vercel cron GET worker invocation with CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron_secret_phase660";
    expect(() =>
      assertCreativePublishWorkerAuthorized("Bearer cron_secret_phase660"),
    ).not.toThrow();
    const response = await workerRouteGet(
      new Request("https://app.example/api/v1/internal/creative/publish/worker", {
        method: "GET",
        headers: { Authorization: "Bearer cron_secret_phase660" },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  it("supports POST worker route for manual invocation", async () => {
    const response = await workerRoutePost(
      new Request("https://app.example/api/v1/internal/creative/publish/worker", {
        method: "POST",
        headers: {
          Authorization: "Bearer worker_secret_phase660",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
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
});
