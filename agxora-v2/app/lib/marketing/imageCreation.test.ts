import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canUseCapability } from "@/app/lib/billing/entitlements";
import { decideGovernedExecution, type ExecutionSubscription } from "@/app/lib/billing/executionPolicy";
import { RATE_LIMIT_POLICIES } from "@/app/lib/security/rate-limit/config";
import { getCapability } from "@/features/agents/capabilities/registry";
import { capabilitiesForRole } from "@/features/agents/workforce/workers";
import { assessMarketingImageAccess, priorMarketingImageMatches, readMarketingImageAction } from "./imageAccess";
import { buildMarketingImageBrief, marketingImageIdempotencyKey } from "./imageBrief";
import {
  decideMarketingImageReview,
  runMarketingImage,
  type ImageExecution,
  type ImageFlowStore,
  type ImageProviderCall,
} from "./imageFlow";
import type { MarketingPlanDocument } from "@/features/agents/marketing/planSchema";

const ROOT = path.resolve(__dirname, "../../..");
const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-09-29T12:00:00.000Z");
const DRAFT = "DRAFT_COPY_SECRET customers called this the best lunch and left five stars";
const FACT = "CRM_FACT_PRIVATE_INVOICE_91";
const STRATEGY = "STRATEGY_PRIVATE_TEXT";
const GOAL = "GOAL_STATEMENT_PRIVATE";

function plan(status: MarketingPlanDocument["status"] = "approved_stored"): MarketingPlanDocument {
  return {
    goalStatement: GOAL,
    planWindow: { days: 7, label: "next_7_days" },
    businessFactsUsed: [{ key: "invoice", text: FACT }],
    missingFacts: [],
    strategy: STRATEGY,
    audience: "Local office workers",
    offer: "Weekday lunch menu",
    channelIntent: "instagram",
    contentThemes: ["Menu"],
    contentItems: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      day,
      theme: `Theme ${day}`,
      draftCopy: `${DRAFT} ${day}`,
      callToAction: "See today's menu",
    })),
    status,
    provenance: "model_proposal",
    modelId: "gpt-test",
    simulated: false,
    contextRecordIds: [],
    narrowedFromPublish: false,
  };
}

function subscription(planCode: ExecutionSubscription["planCode"]): ExecutionSubscription {
  return {
    organizationId: ORG,
    planCode,
    status: "ACTIVE",
    currentPeriodEnd: new Date("2026-10-29T12:00:00.000Z"),
    cancelAtPeriodEnd: false,
  };
}

class MemoryImageStore implements ImageFlowStore {
  readonly rows: ImageExecution[] = [];
  readonly evidence: { executionId: string; action: string; metadata: Readonly<Record<string, string>> }[] = [];
  readonly memories: { executionId: string; content: string }[] = [];
  readonly order: string[] = [];

  async findByKey(organizationId: string, idempotencyKey: string): Promise<ImageExecution | null> {
    return this.rows.find((row) => row.organizationId === organizationId && row.idempotencyKey === idempotencyKey) ?? null;
  }

  async insertReserved(row: ImageExecution): Promise<"created" | "exists"> {
    this.order.push("reserve");
    const exists = this.rows.some((item) => item.organizationId === row.organizationId && item.idempotencyKey === row.idempotencyKey);
    if (exists) return "exists";
    this.rows.push({ ...row, outcome: { ...row.outcome } });
    return "created";
  }

  async update(id: string, patch: Partial<Pick<ImageExecution, "status" | "approval" | "verificationStatus" | "outcome">>): Promise<ImageExecution> {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing");
    if (patch.status) row.status = patch.status;
    if (patch.approval) row.approval = patch.approval;
    if (patch.verificationStatus) row.verificationStatus = patch.verificationStatus;
    row.outcome = { ...row.outcome, ...(patch.outcome ?? {}) };
    if (patch.approval) row.outcome = { ...row.outcome, approval: patch.approval };
    if (patch.status) this.order.push(patch.status);
    return row;
  }

  async appendEvidence(input: { execution: ImageExecution; action: string; status: string; metadata: Readonly<Record<string, string>> }): Promise<string> {
    this.evidence.push({ executionId: input.execution.executionId, action: input.action, metadata: input.metadata });
    return `evidence-${this.evidence.length}`;
  }

  async findEvidence(input: { organizationId: string; executionId: string; action: string }): Promise<boolean> {
    return this.evidence.some((item) => item.executionId === input.executionId && item.action === input.action);
  }

  async memoryExists(_organizationId: string, executionId: string): Promise<boolean> {
    return this.memories.some((item) => item.executionId === executionId);
  }

  async remember(input: { organizationId: string; executionId: string; content: string }): Promise<string> {
    this.memories.push({ executionId: input.executionId, content: input.content });
    return `memory-${this.memories.length}`;
  }

  async markCurrent(input: { organizationId: string; goalId: string; planId: string; day: number; executionId: string }): Promise<void> {
    for (const row of this.rows) {
      if (row.organizationId !== input.organizationId || row.businessGoalId !== input.goalId || row.planId !== input.planId) continue;
      if (row.approval !== "approved" || row.outcome.day !== input.day) continue;
      row.outcome = { ...row.outcome, current: row.executionId === input.executionId };
    }
  }
}

function harness(options?: { failProvider?: boolean; failStorage?: boolean; delayMs?: number }) {
  const store = new MemoryImageStore();
  const blobs = new Map<string, Uint8Array>();
  const prompts: string[] = [];
  let providerCalls = 0;
  const provider: ImageProviderCall = async (call) => {
    providerCalls += 1;
    prompts.push(call.prompt);
    store.order.push("provider");
    if (options?.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    if (options?.failProvider) return { ok: false, reason: "openai_http_500" };
    return {
      ok: true,
      image: {
        bytes: Uint8Array.from([9, 8, 7, providerCalls]),
        mimeType: "image/jpeg",
        width: 1024,
        height: 1024,
        model: "gpt-image-1",
        providerId: "openai",
        simulated: false,
      },
    };
  };
  const objects = {
    async put(file: { key: string; bytes: Uint8Array; mimeType: string; assetId: string }) {
      store.order.push("store");
      if (options?.failStorage) throw new Error("storage_failed");
      if (!file.key.startsWith(`org/${ORG}/creative/${file.assetId}/`)) throw new Error("bad key");
      blobs.set(file.key, file.bytes);
    },
    async get(key: string) {
      const bytes = blobs.get(key);
      if (!bytes) throw new Error("missing");
      return bytes;
    },
  };
  return { store, blobs, prompts, provider, objects, calls: () => providerCalls };
}

function request(overrides?: Partial<Parameters<typeof runMarketingImage>[0]["request"]>) {
  const document = plan();
  return {
    organizationId: ORG,
    actorId: "user-1",
    workerId: "worker-1",
    goalId: "goal-1",
    planId: "plan-1",
    planRecordId: "record-1",
    organizationName: "North Kitchen",
    plan: document,
    item: document.contentItems[0]!,
    mode: "generate" as const,
    durable: true,
    ...overrides,
  };
}

async function generate(options?: Parameters<typeof harness>[0], overrides?: Parameters<typeof request>[0]) {
  const tools = harness(options);
  const result = await runMarketingImage({
    request: request(overrides),
    store: tools.store,
    provider: tools.provider,
    objects: tools.objects,
    objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
  });
  return { ...tools, result };
}

describe("marketing image creation", () => {
  it("registers MARKETING_CREATE_IMAGE as a live governed write", () => {
    const capability = getCapability("MARKETING_CREATE_IMAGE");
    expect(capability?.mode).toBe("WRITE");
    expect(capability?.approval.required).toBe(true);
    expect(capability?.security.tenantScoped).toBe(true);
    expect(capability?.execution.idempotencyRequired).toBe(true);
    expect(capability?.verification.required).toBe(true);
    expect(capability?.verification.evidenceType).toBe("creative_asset");
    expect(capability?.availability.status).toBe("LIVE");
    expect(getCapability("MARKETING_IMAGE_CREATION")?.availability.status).toBe("FUTURE");
    expect(getCapability("MARKETING_VIDEO_CREATION")?.availability.status).toBe("FUTURE");
    expect(capabilitiesForRole("MARKETING")).toContain("MARKETING_CREATE_IMAGE");
    expect(capabilitiesForRole("SALES")).not.toContain("MARKETING_CREATE_IMAGE");
  });

  it("allows Business and Professional and blocks Base", () => {
    expect(canUseCapability({ planCode: "agxora_base", capabilityId: "MARKETING_CREATE_IMAGE", access: "paid" })).toBe(false);
    expect(canUseCapability({ planCode: "agxora_business", capabilityId: "MARKETING_CREATE_IMAGE", access: "paid" })).toBe(true);
    expect(canUseCapability({ planCode: "agxora_professional", capabilityId: "MARKETING_CREATE_IMAGE", access: "paid" })).toBe(true);
    expect(canUseCapability({ planCode: null, capabilityId: "MARKETING_CREATE_IMAGE", access: "legacy" })).toBe(false);
    const registryStatus = "LIVE" as const;
    expect(decideGovernedExecution({
      organizationId: ORG,
      subscription: subscription("agxora_base"),
      capabilityId: "MARKETING_CREATE_IMAGE",
      registryStatus,
      counted: 0,
      now: NOW,
      replaying: false,
    }).allow).toBe(false);
    expect(decideGovernedExecution({
      organizationId: ORG,
      subscription: subscription("agxora_business"),
      capabilityId: "MARKETING_CREATE_IMAGE",
      registryStatus,
      counted: 0,
      now: NOW,
      replaying: false,
    }).allow).toBe(true);
    expect(decideGovernedExecution({
      organizationId: ORG,
      subscription: subscription("agxora_professional"),
      capabilityId: "MARKETING_CREATE_IMAGE",
      registryStatus,
      counted: 0,
      now: NOW,
      replaying: false,
    }).allow).toBe(true);
  });

  it("blocks a missing, rejected, or foreign plan and a missing worker", () => {
    const allowed = {
      actorOrganizationId: ORG,
      planOrganizationId: ORG,
      planFound: true,
      planStatus: "approved_stored" as const,
      itemFound: true,
      recordCompleted: true,
      workerActive: true,
      entitled: true,
    };
    expect(assessMarketingImageAccess({ ...allowed, planStatus: "missing" }).ok).toBe(false);
    expect(assessMarketingImageAccess({ ...allowed, planStatus: "rejected" }).status).toBe(403);
    expect(assessMarketingImageAccess({ ...allowed, planStatus: "draft" }).status).toBe(403);
    expect(assessMarketingImageAccess({ ...allowed, planFound: false }).status).toBe(404);
    expect(assessMarketingImageAccess({ ...allowed, planOrganizationId: OTHER }).status).toBe(404);
    expect(assessMarketingImageAccess({ ...allowed, clientOrganizationId: OTHER }).status).toBe(404);
    expect(assessMarketingImageAccess({ ...allowed, workerActive: false }).status).toBe(403);
    expect(assessMarketingImageAccess({ ...allowed, entitled: false }).status).toBe(403);
    expect(assessMarketingImageAccess(allowed).ok).toBe(true);
    expect(priorMarketingImageMatches({
      actorOrganizationId: ORG,
      organizationId: OTHER,
      goalId: "goal-1",
      planId: "plan-1",
      executionGoalId: "goal-1",
      executionPlanId: "plan-1",
      day: 1,
      outcomeDay: 1,
      capabilityId: "MARKETING_CREATE_IMAGE",
    })).toBe(false);
  });

  it("requires an explicit generate action and reserves execution before the provider", async () => {
    expect(readMarketingImageAction({}, "generate").ok).toBe(false);
    expect(readMarketingImageAction({ action: "generate" }, "generate").ok).toBe(true);
    expect(readMarketingImageAction({ action: "generate" }, "regenerate").ok).toBe(false);
    const run = await generate();
    expect(run.result.ok).toBe(true);
    const reserveAt = run.store.order.indexOf("reserve");
    const providerAt = run.store.order.indexOf("provider");
    expect(reserveAt).toBeGreaterThanOrEqual(0);
    expect(providerAt).toBeGreaterThan(reserveAt);
    expect(run.calls()).toBe(1);
  });

  it("sends a server brief and keeps draft copy, facts, and testimonials out", async () => {
    const document = plan();
    const brief = buildMarketingImageBrief({
      organizationName: "North Kitchen",
      plan: document,
      item: document.contentItems[0]!,
    });
    expect(brief.prompt).toContain("Weekday lunch menu");
    expect(brief.prompt).toContain("Do not invent testimonials");
    expect(brief.prompt).not.toContain(DRAFT);
    expect(brief.prompt).not.toContain(FACT);
    expect(brief.prompt).not.toContain(STRATEGY);
    expect(brief.prompt).not.toContain(GOAL);
    expect(brief.prompt).not.toContain("five stars");
    const run = await generate();
    expect(run.prompts[0]).toBe(brief.prompt);
    expect(JSON.stringify(run.result)).not.toContain(DRAFT);
  });

  it("stores a durable preview, approves once, and writes one verified memory", async () => {
    const run = await generate();
    expect(run.result.ok).toBe(true);
    if (!run.result.ok) return;
    expect(run.result.result.published).toBe(false);
    expect(run.result.result.providerId).toBe("openai");
    expect(run.result.result.simulated).toBe(false);
    expect(run.result.result.previewPath).toContain("/api/v1/agents/marketing/image/preview");
    expect(run.blobs.size).toBe(1);
    const row = run.store.rows[0]!;
    const bytes = run.blobs.get(String(row.outcome.objectKey))!;
    const mismatch = await decideMarketingImageReview({
      execution: row,
      organizationId: ORG,
      decision: "approve",
      bytes: Uint8Array.from([1, 2, 3]),
      store: run.store,
    });
    expect(mismatch.ok).toBe(false);
    const approved = await decideMarketingImageReview({
      execution: row,
      organizationId: ORG,
      decision: "approve",
      bytes,
      store: run.store,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.result.approval).toBe("approved");
    expect(approved.result.verificationStatus).toBe("verified");
    expect(run.store.memories).toHaveLength(1);
    expect(run.store.memories[0]?.content).toContain("An approved marketing image exists");
    expect(run.store.memories[0]?.content).not.toMatch(/liked|sales|conversion|revenue/i);
    const again = await decideMarketingImageReview({
      execution: run.store.rows[0]!,
      organizationId: ORG,
      decision: "approve",
      bytes,
      store: run.store,
    });
    expect(again.ok).toBe(true);
    expect(run.store.memories).toHaveLength(1);
    expect(run.store.evidence.filter((item) => item.action === "marketing.image.verified")).toHaveLength(1);
    const foreign = await decideMarketingImageReview({
      execution: { ...row, approval: "preview" },
      organizationId: OTHER,
      decision: "approve",
      bytes,
      store: run.store,
    });
    expect(foreign.ok).toBe(false);
  });

  it("does not approve a rejected image or write verified memory", async () => {
    const run = await generate();
    const row = run.store.rows[0]!;
    const rejected = await decideMarketingImageReview({
      execution: row,
      organizationId: ORG,
      decision: "reject",
      bytes: null,
      store: run.store,
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.result.approval).toBe("rejected");
    expect(run.store.memories).toHaveLength(0);
    expect(run.store.rows[0]?.outcome.current).not.toBe(true);
    const later = await decideMarketingImageReview({
      execution: run.store.rows[0]!,
      organizationId: ORG,
      decision: "approve",
      bytes: run.blobs.get(String(row.outcome.objectKey))!,
      store: run.store,
    });
    expect(later.ok).toBe(false);
    expect(run.store.memories).toHaveLength(0);
  });

  it("replays the same key, collapses concurrent requests, and regenerates separately", async () => {
    const first = await generate();
    const second = await runMarketingImage({
      request: request(),
      store: first.store,
      provider: first.provider,
      objects: first.objects,
      objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
    });
    expect(first.calls()).toBe(1);
    expect(second.ok && second.replayed).toBe(true);
    expect(second.ok && second.result.assetId).toBe(first.result.ok ? first.result.result.assetId : "");
    expect(first.blobs.size).toBe(1);

    const concurrentTools = harness({ delayMs: 40 });
    const concurrentRequest = request();
    const [left, right] = await Promise.all([
      runMarketingImage({
        request: concurrentRequest,
        store: concurrentTools.store,
        provider: concurrentTools.provider,
        objects: concurrentTools.objects,
        objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
      }),
      runMarketingImage({
        request: concurrentRequest,
        store: concurrentTools.store,
        provider: concurrentTools.provider,
        objects: concurrentTools.objects,
        objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
      }),
    ]);
    expect(concurrentTools.calls()).toBe(1);
    expect(concurrentTools.blobs.size).toBe(1);
    expect(left.ok && right.ok).toBe(true);
    if (left.ok && right.ok) {
      const assets = [left.result.assetId, right.result.assetId].filter(Boolean);
      expect(new Set(assets).size).toBe(1);
    }

    const prior = first.store.rows[0]!.executionId;
    const regenerated = await runMarketingImage({
      request: request({ mode: "regenerate", priorExecutionId: prior }),
      store: first.store,
      provider: first.provider,
      objects: first.objects,
      objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
    });
    expect(first.calls()).toBe(2);
    expect(regenerated.ok && regenerated.replayed).toBe(false);
    expect(regenerated.ok ? regenerated.result.executionId : "").not.toBe(prior);
    expect(marketingImageIdempotencyKey({
      organizationId: ORG,
      goalId: "goal-1",
      planId: "plan-1",
      day: 1,
      mode: "regenerate",
      priorExecutionId: prior,
    })).not.toBe(marketingImageIdempotencyKey({
      organizationId: ORG,
      goalId: "goal-1",
      planId: "plan-1",
      day: 1,
      mode: "generate",
    }));
    expect(first.store.evidence.some((item) => item.executionId === prior)).toBe(true);
    expect(first.blobs.size).toBe(2);
  });

  it("does not retry a provider failure and marks storage failure ambiguous", async () => {
    const failed = await generate({ failProvider: true });
    expect(failed.calls()).toBe(1);
    expect(failed.blobs.size).toBe(0);
    expect(failed.result.ok && failed.result.result.status).toBe("FAILED");
    const replay = await runMarketingImage({
      request: request(),
      store: failed.store,
      provider: failed.provider,
      objects: failed.objects,
      objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
    });
    expect(failed.calls()).toBe(1);
    expect(replay.ok && replay.replayed).toBe(true);

    const stored = await generate({ failStorage: true });
    expect(stored.calls()).toBe(1);
    expect(stored.result.ok).toBe(false);
    if (!stored.result.ok) expect(stored.result.ambiguous).toBe(true);
    expect(stored.store.rows[0]?.status).toBe("AMBIGUOUS");
    const storedReplay = await runMarketingImage({
      request: request(),
      store: stored.store,
      provider: stored.provider,
      objects: stored.objects,
      objectKey: (assetId) => `org/${ORG}/creative/${assetId}/${assetId}`,
    });
    expect(stored.calls()).toBe(1);
    expect(storedReplay.ok && storedReplay.replayed).toBe(true);
  });

  it("keeps secrets, side effects, and the creative rate limit out of this flow", () => {
    const files = [
      "app/lib/marketing/imageBrief.ts",
      "app/lib/marketing/imageFlow.ts",
      "app/lib/marketing/imageServer.ts",
      "app/lib/marketing/imageAccess.ts",
      "app/api/v1/agents/marketing/image/generate/route.ts",
      "app/api/v1/agents/marketing/image/regenerate/route.ts",
      "features/agents/components/MarketingImageControls.tsx",
    ].map((file) => readFileSync(path.join(ROOT, file), "utf8"));
    const source = files.join("\n");
    expect(source).not.toContain("NEXT_PUBLIC");
    expect(source).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(source).not.toContain("createInvoice");
    expect(source).not.toContain("sendCustomerEmail");
    expect(source).not.toContain("social_publish");
    expect(source).not.toContain("impressions");
    expect(files[2]).toContain("void body?.prompt");
    expect(files[2]).toContain("clientOrganizationId");
    expect(files[2]).not.toContain("organizationId: body");
    expect(files[4]).toContain('policyId: "agents.creative_generate"');
    expect(files[5]).toContain('policyId: "agents.creative_generate"');
    expect(RATE_LIMIT_POLICIES["agents.creative_generate"].max).toBe(10);
    expect(RATE_LIMIT_POLICIES["agents.creative_generate"].windowMs).toBe(60 * 60 * 1000);
  });
});
