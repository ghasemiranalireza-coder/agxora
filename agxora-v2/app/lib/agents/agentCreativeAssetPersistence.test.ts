/**
 * Phase 60 — Durable Creative Asset Persistence (IMAGE_AD) tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { emptyAgentsState } from "@/features/agents/repositories/state";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  generateCreativeImageForActor,
  setCreativeGenerateLoadStateForTests,
} from "@/app/lib/creative/generate";
import { setServerCreativeImageProviderForTests } from "@/app/lib/creative/serverProvider";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
  parseDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import {
  loadCreativeAssetForActor,
  setCreativeAssetLoadStateForTests,
} from "@/app/lib/creative/assetAccess";
import {
  MAX_CREATIVE_ASSET_DECODED_BYTES,
  isDurableCreativeAssetUrl,
  sanitizeAssetsForPersistence,
} from "@/app/lib/creative/assets";
import { creativeService } from "@/features/agents/creative/service";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function actorFor(organizationId: string, userId = "user_phase60"): Actor {
  return {
    userId,
    email: "phase60@example.com",
    name: "Phase 60",
    organizationId,
    workspaceId: "ws_phase60",
    membershipId: "mem_phase60",
    role: "OWNER",
    sessionToken: "session_phase60",
  };
}

function baseProject(
  organizationId: string,
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  return {
    id: "creative_test_1",
    organizationId,
    profileId: "profile_1",
    name: "Phase 60 IMAGE_AD",
    creativeType: "IMAGE_AD",
    platform: "instagram_feed",
    status: "APPROVED",
    brief: {
      productOrService: "Jackets",
      targetAudience: "Shoppers",
      campaignGoal: "Awareness",
      language: "en",
      tone: "friendly",
      durationSeconds: 0,
      aspectRatio: "1:1",
      cta: "Shop now",
      brandNotes: "Clean",
      customerRequest: "TRUSTED_SERVER_BRIEF",
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
      summary: "Image ad",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      estimatedDurationSeconds: 0,
      aspectRatio: "1:1",
      requiresExternalGeneration: true,
      checklist: ["generate"],
    },
    approvalState: "APPROVED",
    executionJobId: "job_1",
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
    ...overrides,
  };
}

function baseApproval(
  organizationId: string,
  overrides: Partial<AgentApproval> = {},
): AgentApproval {
  return {
    id: "approval_1",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_1",
    stepId: "step_1",
    toolId: "creative_generate",
    action: "creative_generate",
    reason: "External generation",
    state: "APPROVED",
    requestedAt: "2026-08-27T00:00:00.000Z",
    decidedAt: "2026-08-27T00:01:00.000Z",
    decidedBy: "op",
    ...overrides,
  };
}

function baseJob(
  organizationId: string,
  overrides: Partial<ExecutionJob> = {},
): ExecutionJob {
  return {
    id: "job_1",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_generate",
    title: "Generate",
    status: "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: "approval_1",
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 3,
    retryable: true,
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
    taskId: "task_1",
    params: { creativeId: "creative_test_1", growthAction: "creative_generate" },
    ...overrides,
  };
}

function stateWithAuthz(
  organizationId: string,
  options: {
    project?: CreativeProject;
    approval?: AgentApproval;
    job?: ExecutionJob;
  } = {},
): AgentsPersistedState {
  const project = options.project ?? baseProject(organizationId);
  const approval = options.approval ?? baseApproval(organizationId);
  const job = options.job ?? baseJob(organizationId);
  return {
    ...emptyAgentsState(),
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
  };
}

function tinyJpegDataUrl(payload = "phase60-img"): string {
  return `data:image/jpeg;base64,${Buffer.from(payload).toString("base64")}`;
}

function configuredImageProvider(url: string) {
  return {
    id: "openai",
    configured: true,
    modalities: ["image"] as const,
    async health() {
      return { ok: true as const };
    },
    async generate() {
      return {
        available: true,
        generated: true,
        status: "completed" as const,
        reason: "generated",
        providerId: "openai",
        assets: [
          {
            providerId: "openai",
            url,
            mimeType: "image/jpeg",
            width: 1024,
            height: 1024,
          },
        ],
      };
    },
  };
}

describe("Phase 60 creative asset store", () => {
  beforeEach(() => {
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
  });

  afterEach(() => {
    setCreativeAssetStoreForTests(null);
  });

  it("puts and gets a valid image", async () => {
    const store = createMemoryCreativeAssetStore();
    setCreativeAssetStoreForTests(store);
    const bytes = new Uint8Array(Buffer.from("hello-image"));
    const put = await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_1",
      assetId: "asset_1",
      mimeType: "image/jpeg",
      bytes,
      width: 10,
      height: 10,
      providerId: "openai",
    });
    expect(put.byteSize).toBe(bytes.byteLength);
    const got = await store.get({
      organizationId: ORG_A,
      creativeProjectId: "creative_1",
      assetId: "asset_1",
    });
    expect(got?.mimeType).toBe("image/jpeg");
    expect(Buffer.from(got!.bytes).toString()).toBe("hello-image");
  });

  it("rejects unsupported MIME, oversized, and empty bytes", async () => {
    const store = createMemoryCreativeAssetStore();
    await expect(
      store.put({
        organizationId: ORG_A,
        creativeProjectId: "c1",
        assetId: "a1",
        mimeType: "application/pdf",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({ code: "validation" });

    await expect(
      store.put({
        organizationId: ORG_A,
        creativeProjectId: "c1",
        assetId: "a1",
        mimeType: "image/png",
        bytes: new Uint8Array(0),
      }),
    ).rejects.toMatchObject({ code: "validation" });

    await expect(
      store.put({
        organizationId: ORG_A,
        creativeProjectId: "c1",
        assetId: "a1",
        mimeType: "image/png",
        bytes: new Uint8Array(MAX_CREATIVE_ASSET_DECODED_BYTES + 1),
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });
});

describe("Phase 60 asset authorization", () => {
  beforeEach(() => {
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    setCreativeAssetLoadStateForTests(async () => stateWithAuthz(ORG_A));
  });

  afterEach(() => {
    setCreativeAssetStoreForTests(null);
    setCreativeAssetLoadStateForTests(null);
  });

  it("same-org GET succeeds; cross-org / wrong creative / unknown fail", async () => {
    const store = createMemoryCreativeAssetStore();
    setCreativeAssetStoreForTests(store);
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_test_1",
      assetId: "asset_ok",
      mimeType: "image/png",
      bytes: new Uint8Array([1, 2, 3, 4]),
    });

    const ok = await loadCreativeAssetForActor(
      actorFor(ORG_A),
      "creative_test_1",
      "asset_ok",
    );
    expect(ok.bytes.byteLength).toBe(4);

    await expect(
      loadCreativeAssetForActor(actorFor(ORG_B), "creative_test_1", "asset_ok"),
    ).rejects.toMatchObject({ code: "not_found" });

    setCreativeAssetLoadStateForTests(async () => stateWithAuthz(ORG_A));
    await expect(
      loadCreativeAssetForActor(actorFor(ORG_A), "creative_other", "asset_ok"),
    ).rejects.toMatchObject({ code: "not_found" });

    await expect(
      loadCreativeAssetForActor(actorFor(ORG_A), "creative_test_1", "missing"),
    ).rejects.toMatchObject({ code: "not_found" });

    expect(
      new PersistenceError("unauthorized", "Authentication required").status,
    ).toBe(401);
  });
});

describe("Phase 60 generate → durable persist lifecycle", () => {
  beforeEach(() => {
    setAgentsRepository(new MemoryAgentsRepository(emptyAgentsState()));
    agentsStore.hydrate(emptyAgentsState());
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));
    setCreativeAssetLoadStateForTests(async () => stateWithAuthz(ORG_A));
    setServerCreativeImageProviderForTests(
      configuredImageProvider(tinyJpegDataUrl()),
    );
  });

  afterEach(() => {
    setCreativeGenerateLoadStateForTests(null);
    setCreativeAssetLoadStateForTests(null);
    setCreativeAssetStoreForTests(null);
    setServerCreativeImageProviderForTests(null);
    creativeService.clearPreviewAssetsForTests();
    vi.restoreAllMocks();
  });

  it("stores image, persists durable URL in v7, survives preview Map clear", async () => {
    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(out.result.generated).toBe(true);
    expect(out.result.status).toBe("completed");
    const durableUrl = out.productionResult.assets?.[0]?.url;
    expect(durableUrl).toBeTruthy();
    expect(isDurableCreativeAssetUrl(durableUrl!)).toBe(true);
    expect(JSON.stringify(out.productionResult)).not.toContain("data:image/");

    const parsed = parseDurableCreativeAssetUrl(durableUrl!);
    expect(parsed).not.toBeNull();

    creativeService.clearPreviewAssetsForTests();
    const hydratedAssets = sanitizeAssetsForPersistence(
      out.productionResult.assets ?? [],
    );
    expect(hydratedAssets[0]?.url).toBe(durableUrl);

    const record = await loadCreativeAssetForActor(
      actorFor(ORG_A),
      parsed!.creativeProjectId,
      parsed!.assetId,
    );
    expect(record.mimeType).toBe("image/jpeg");
    expect(record.bytes.byteLength).toBeGreaterThan(0);
    expect(
      buildDurableCreativeAssetUrl(parsed!.creativeProjectId, parsed!.assetId),
    ).toBe(durableUrl);
    expect(emptyAgentsState().version).toBe(7);
  });

  it("provider success + storage failure does not become COMPLETED", async () => {
    setCreativeAssetStoreForTests({
      id: "memory",
      async put() {
        throw new PersistenceError("persistence", "disk full");
      },
      async get() {
        return null;
      },
      async deletePrimary() {},
    });

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(out.result.generated).toBe(false);
    expect(out.result.status).toBe("failed");
    expect(out.result.reason).toBe("creative_asset_storage_failed");
    expect(out.productionResult.assets ?? []).toEqual([]);
    expect(out.productionResult.generated).toBe(false);
  });

  it("does not silently regenerate a COMPLETED durable creative", async () => {
    const first = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(first.result.generated).toBe(true);
    const durableUrl = first.productionResult.assets?.[0]?.url;

    const completedProject = baseProject(ORG_A, {
      status: "COMPLETED",
      productionResult: first.productionResult,
    });
    const generateSpy = vi.fn(async () => ({
      available: true,
      generated: true,
      status: "completed" as const,
      reason: "generated",
      providerId: "openai",
      assets: [
        {
          providerId: "openai",
          url: tinyJpegDataUrl("second"),
          mimeType: "image/jpeg",
        },
      ],
    }));
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      generate: generateSpy,
    });
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, { project: completedProject }),
    );

    const blocked = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(blocked.result.reason).toBe("creative_already_has_durable_asset");
    expect(blocked.result.generated).toBe(false);
    expect(generateSpy).not.toHaveBeenCalled();

    const regenerated = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      regenerate: true,
    });
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(regenerated.result.generated).toBe(true);
    expect(regenerated.productionResult.assets?.[0]?.url).toMatch(
      /^\/api\/v1\/agents\/creative\/assets\//,
    );
    expect(regenerated.productionResult.assets?.[0]?.url).not.toBe(durableUrl);
  });
});

describe("Phase 60 regressions", () => {
  it("keeps Phase 57 production gate ready matrix", () => {
    const gate = evaluateFirstCustomerProductionGate({
      runtime: "production",
      nodeEnv: "production",
      authRequired: true,
      authMode: "server",
      crmPersistence: "database",
      agentOsPersistence: "server",
      emailProvider: "http",
      useMocks: false,
    });
    expect(gate.ready).toBe(true);
  });
});
