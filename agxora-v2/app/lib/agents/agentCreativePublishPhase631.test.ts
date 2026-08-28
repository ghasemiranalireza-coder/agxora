/**
 * Phase 63.1 — YouTube publish hardening adversarial + security tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject, CreativePublishResult } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  publishCreativeForActor,
  setCreativePublishLoadStateForTests,
} from "@/app/lib/creative/publish";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import * as invokeSocialPublish from "@/app/lib/creative/invokeSocialPublish";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import {
  setPersistPublishResultForTests,
} from "@/app/lib/creative/persistPublishResult";
import {
  setPublishAttemptStoreForTests,
  acquireCreativePublishAttempt,
} from "@/app/lib/creative/publishIdempotency";
import {
  setSocialCredentialStoreForTests,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import {
  setSocialOAuthStateStoreForTests,
  issueSocialOAuthState,
  consumeSocialOAuthState,
} from "@/app/lib/social/oauth/state";
import { createPkcePair } from "@/app/lib/social/credentials";
import { publishCreativeToYouTube } from "@/app/lib/social/adapters/youtubePublish";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function actorFor(organizationId: string, userId = "user_phase631"): Actor {
  return {
    userId,
    email: "phase631@example.com",
    name: "Phase 631",
    organizationId,
    workspaceId: "ws_phase631",
    membershipId: "mem_phase631",
    role: "OWNER",
    sessionToken: "session_phase631",
  };
}

function youtubeVideoProject(
  organizationId: string,
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  const assetId = "casset_phase631_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase631", assetId);
  return {
    id: "creative_phase631",
    organizationId,
    profileId: "profile_1",
    name: "Phase 63.1 YouTube",
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
    publishExecutionJobId: "publish_job_631",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    ...overrides,
  };
}

function publishState(
  organizationId: string,
  patch: {
    project?: Partial<CreativeProject>;
    job?: Partial<ExecutionJob>;
    approval?: Partial<AgentApproval>;
    socialAccountState?: "DISCONNECTED" | "CONNECTED";
    platform?: "youtube" | "instagram";
  } = {},
): AgentsPersistedState {
  const project = youtubeVideoProject(organizationId, patch.project);
  const approval: AgentApproval = {
    id: "publish_approval_631",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_631",
    stepId: "step_1",
    toolId: "creative_publish",
    action: "creative_publish",
    reason: "External publish",
    state: "APPROVED",
    requestedAt: "2026-08-28T00:00:00.000Z",
    decidedAt: "2026-08-28T00:01:00.000Z",
    decidedBy: "op",
    ...patch.approval,
  };
  const job: ExecutionJob = {
    id: "publish_job_631",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_publish",
    title: "Publish",
    status: patch.job?.status ?? "WAITING_FOR_APPROVAL",
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
    taskId: "task_publish_631",
    params: {
      creativeId: project.id,
      growthAction: "creative_publish",
    },
    ...patch.job,
  };
  const platform = patch.platform ?? "youtube";
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    socialAccounts: [
      {
        id: "sacc_631",
        organizationId,
        platform,
        state: patch.socialAccountState ?? "DISCONNECTED",
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

async function seedVideoAsset(organizationId: string, creativeProjectId: string) {
  const store = createMemoryCreativeAssetStore();
  setCreativeAssetStoreForTests(store);
  await store.put({
    organizationId,
    creativeProjectId,
    assetId: "casset_phase631_primary",
    mimeType: "video/mp4",
    bytes: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
    byteSize: 8,
    durationMs: 15000,
    modality: "video",
    providerId: "openai",
    providerAssetId: "prov_631",
  });
}

async function seedYouTubeCredential(actor: Actor) {
  await upsertSocialCredentialForActor(actor, "youtube", {
    tokens: { accessToken: "yt_access_token", refreshToken: "yt_refresh" },
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    externalAccountId: "channel_631",
    externalAccountName: "Test Channel",
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
  });
}

describe("Phase 63.1 YouTube publish hardening", () => {
  const persistedStates = new Map<string, AgentsPersistedState>();

  beforeEach(() => {
    vi.restoreAllMocks();
    persistedStates.clear();
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    setSocialOAuthStateStoreForTests(null);
    setPersistPublishResultForTests(async (actor, state) => {
      persistedStates.set(actor.organizationId, state);
      return state;
    });
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
  });

  afterEach(() => {
    setPersistPublishResultForTests(null);
    setPublishAttemptStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    setSocialOAuthStateStoreForTests(null);
    delete process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED;
  });

  it("rejects cross-org publish", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    await expect(
      publishCreativeForActor(actorFor(ORG_B), {
        creativeProjectId: "creative_phase631",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects wrong publishExecutionJobId", async () => {
    const state = publishState(ORG_A, {
      project: { publishExecutionJobId: "stale_job" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase631",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects creative_generate approval", async () => {
    const state = publishState(ORG_A);
    state.approvals[0] = { ...state.approvals[0]!, toolId: "creative_generate" };
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase631",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns unavailable when credentials are missing", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase631",
    });
    expect(result.publishResult.status).toBe("unavailable");
    expect(result.publishResult.published).toBe(false);
    expect(result.publishResult.reason).toBe("social_credential_missing");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns unavailable when token refresh fails", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await upsertSocialCredentialForActor(actorFor(ORG_A), "youtube", {
      tokens: { accessToken: "expired", refreshToken: "bad_refresh" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      accessTokenExpiresAt: new Date(Date.now() - 60_000),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase631",
    });
    expect(result.publishResult.reason).toBe("social_token_refresh_failed");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns unavailable when YouTube feature flag is disabled", async () => {
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "false";
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase631",
    });
    expect(result.publishResult.reason).toBe("youtube_publish_disabled");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not call adapter on authorization failure", async () => {
    const state = publishState(ORG_A, {
      approval: { state: "REJECTED" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase631",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("allows only one adapter invocation for concurrent duplicate publish", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = vi
      .spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish")
      .mockImplementation(async () => {
        await gate;
        return {
          available: true,
          status: "published",
          published: true,
          externalId: "yt_video_1",
        };
      });

    const actor = actorFor(ORG_A);
    const first = publishCreativeForActor(actor, {
      creativeProjectId: "creative_phase631",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(
      publishCreativeForActor(actor, {
        creativeProjectId: "creative_phase631",
      }),
    ).rejects.toMatchObject({ code: "conflict" });
    release();
    const result = await first;
    expect(result.publishResult.published).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("publishes successfully with externalId", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));
    vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish").mockResolvedValue({
      available: true,
      status: "published",
      published: true,
      externalId: "yt_video_ok",
    });
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase631",
    });
    expect(result.publishResult.published).toBe(true);
    expect(result.publishResult.externalId).toBe("yt_video_ok");
  });

  it("preserves productionResult on failed publish", async () => {
    const project = youtubeVideoProject(ORG_A);
    const state = publishState(ORG_A, {
      project,
      socialAccountState: "CONNECTED",
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, project.id);
    await seedYouTubeCredential(actorFor(ORG_A));
    vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish").mockResolvedValue({
      available: true,
      status: "failed",
      published: false,
      reason: "youtube_upload_failed",
    });
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
    });
    expect(result.publishResult.published).toBe(false);
    expect(project.productionResult?.generated).toBe(true);
  });

  it("rejects client oauthToken and assetUrl overrides", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase631",
        oauthToken: "client_token",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase631",
        assetUrl: "https://evil.example/v.mp4",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("persists publishResult server-side across reload", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));
    vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish").mockResolvedValue({
      available: true,
      status: "published",
      published: true,
      externalId: "yt_persist_1",
    });
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase631",
    });
    const persisted = persistedStates.get(ORG_A);
    expect(persisted?.creativeProjects[0]?.publishResult?.published).toBe(true);
    expect(persisted?.creativeProjects[0]?.publishResult?.externalId).toBe("yt_persist_1");
  });

  it("rejects bad OAuth state on consume", async () => {
    const actor = actorFor(ORG_A);
    await expect(
      consumeSocialOAuthState({
        actor,
        platform: "youtube",
        state: "invalid_state",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects cross-org OAuth state consumption", async () => {
    const actorA = actorFor(ORG_A, "user_a");
    const pkce = createPkcePair();
    const issued = await issueSocialOAuthState({
      actor: actorA,
      platform: "youtube",
      codeVerifier: pkce.verifier,
    });
    await expect(
      consumeSocialOAuthState({
        actor: actorFor(ORG_B, "user_b"),
        platform: "youtube",
        state: issued.state,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects IMAGE_AD to YouTube honestly", async () => {
    const result = await publishCreativeToYouTube({
      project: youtubeVideoProject(ORG_A, {
        creativeType: "IMAGE_AD",
        productionPlan: {
          summary: "Image",
          creativeType: "IMAGE_AD",
          platform: "youtube",
          modality: "image",
          estimatedDurationSeconds: 0,
          aspectRatio: "1:1",
          requiresExternalGeneration: true,
          checklist: [],
        },
      }),
      target: {
        socialPlatform: "youtube",
        contentType: "VIDEO",
        adapterAction: "publishPost",
      },
      media: {
        mode: "buffer",
        mimeType: "image/jpeg",
        byteSize: 4,
        bytes: new Uint8Array([1, 2, 3, 4]),
        assetId: "img",
      },
      accessToken: "token",
    });
    expect(result.published).toBe(false);
    expect(result.reason).toBe("video_required");
  });

  it("replays succeeded attempt without adapter call", async () => {
    const prior: CreativePublishResult = {
      available: true,
      status: "published",
      published: true,
      externalId: "yt_replay",
      executionJobId: "publish_job_631",
      platform: "youtube",
      contentType: "VIDEO",
    };
    const state = publishState(ORG_A, {
      socialAccountState: "CONNECTED",
      job: { status: "WAITING_FOR_APPROVAL" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedVideoAsset(ORG_A, "creative_phase631");
    await seedYouTubeCredential(actorFor(ORG_A));

    const lock = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_631",
      creativeProjectId: "creative_phase631",
      assetId: "casset_phase631_primary",
      platform: "youtube",
    });
    expect(lock.kind).toBe("acquired");

    const { completeCreativePublishAttempt } = await import(
      "@/app/lib/creative/publishIdempotency"
    );
    await completeCreativePublishAttempt({
      attemptId: lock.kind === "acquired" ? lock.attemptId : "",
      organizationId: ORG_A,
      status: "succeeded",
      publishResult: prior,
      externalId: "yt_replay",
    });

    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase631",
    });
    expect(result.idempotentReplay).toBe(true);
    expect(result.publishResult.externalId).toBe("yt_replay");
    expect(spy).not.toHaveBeenCalled();
  });

  it("phase 57 production gate remains coherent", () => {
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
