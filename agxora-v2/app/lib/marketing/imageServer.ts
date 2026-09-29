/**
 * Production adapter for one marketing image.
 * Organization, worker, and plan come from the server. The request cannot grant them.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { getAgentOsStateForActor, putAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { assertGovernedExecutionAllowed, commercialBillingSchemaReady } from "@/app/lib/billing/enforce";
import { canUseCapability } from "@/app/lib/billing/entitlements";
import { paidAccessFor } from "@/app/lib/billing/executionPolicy";
import { getCreativeBlobConfig, getCreativeBlobStore } from "@/app/lib/creative/blobStore";
import { buildCreativeObjectKey } from "@/app/lib/creative/blobStore/objectKey";
import { getCreativeImageConfig } from "@/app/lib/creative/config";
import { generateOpenAIImageFromPrompt } from "@/app/lib/creative/openaiImages";
import type { Actor } from "@/app/lib/tenancy/types";
import { createMemoryRecord } from "@/features/agents/memory";
import { capabilitiesForRole } from "@/features/agents/workforce/workers";
import { validateStoredMarketingPlan } from "@/features/agents/marketing/planSchema";
import { assessMarketingImageAccess, priorMarketingImageMatches, readMarketingImageAction } from "./imageAccess";
import {
  decideMarketingImageReview,
  runMarketingImage,
  type ImageExecution,
  type ImageFlowStore,
} from "./imageFlow";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toExecution(row: {
  id: string;
  organizationId: string;
  idempotencyKey: string;
  executionId: string;
  businessGoalId: string | null;
  planId: string | null;
  workerId: string | null;
  actorId: string;
  status: ImageExecution["status"];
  verificationStatus: string;
  outcome: Prisma.JsonValue;
}): ImageExecution {
  const outcome = asRecord(row.outcome) ?? {};
  const approval = outcome.approval;
  return {
    id: row.id,
    organizationId: row.organizationId,
    idempotencyKey: row.idempotencyKey,
    executionId: row.executionId,
    businessGoalId: row.businessGoalId ?? "",
    planId: row.planId ?? "",
    workerId: row.workerId ?? "",
    actorId: row.actorId,
    status: row.status,
    approval: approval === "preview" || approval === "approved" || approval === "rejected" ? approval : "none",
    verificationStatus: row.verificationStatus === "verified" || row.verificationStatus === "failed" ? row.verificationStatus : "pending",
    outcome,
  };
}

function dbStore(actor: Actor): ImageFlowStore {
  return {
    async findByKey(organizationId, idempotencyKey) {
      const row = await prisma.agentGovernedExecution.findUnique({
        where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
      });
      return row && row.organizationId === organizationId ? toExecution(row) : null;
    },
    async insertReserved(row) {
      const billingReady = await commercialBillingSchemaReady();
      try {
        await prisma.$transaction(async (tx) => {
          if (billingReady) {
            await assertGovernedExecutionAllowed(tx, {
              organizationId: row.organizationId,
              capabilityId: "MARKETING_CREATE_IMAGE",
            });
          }
          await tx.agentGovernedExecution.create({
            data: {
              id: row.id,
              organizationId: row.organizationId,
              idempotencyKey: row.idempotencyKey,
              executionId: row.executionId,
              businessGoalId: row.businessGoalId,
              planId: row.planId,
              capabilityId: "MARKETING_CREATE_IMAGE",
              workerId: row.workerId,
              actorId: row.actorId,
              approvalRequired: true,
              approvalGranted: true,
              status: "RESERVED",
              verificationStatus: "pending",
              outcome: { ...row.outcome, approval: "none" } as Prisma.InputJsonValue,
            },
          });
        });
        return "created";
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "exists";
        throw error;
      }
    },
    async update(id, patch) {
      const current = await prisma.agentGovernedExecution.findFirst({ where: { id, organizationId: actor.organizationId } });
      if (!current) throw new Error("Marketing image execution was not found.");
      const outcome = { ...(asRecord(current.outcome) ?? {}), ...(patch.outcome ?? {}) };
      if (patch.approval) outcome.approval = patch.approval;
      const row = await prisma.agentGovernedExecution.update({
        where: { id },
        data: {
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.verificationStatus ? { verificationStatus: patch.verificationStatus } : {}),
          outcome: outcome as Prisma.InputJsonValue,
        },
      });
      return toExecution(row);
    },
    async appendEvidence(input) {
      const created = await prisma.agentGovernedEvidence.create({
        data: {
          organizationId: actor.organizationId,
          executionId: input.execution.executionId,
          businessGoalId: input.execution.businessGoalId,
          planId: input.execution.planId,
          capabilityId: "MARKETING_CREATE_IMAGE",
          workerId: input.execution.workerId,
          actorId: actor.userId,
          action: input.action,
          status: input.status,
          metadata: input.metadata,
        },
      });
      return created.id;
    },
    async findEvidence(input) {
      const row = await prisma.agentGovernedEvidence.findFirst({
        where: {
          organizationId: input.organizationId,
          executionId: input.executionId,
          action: input.action,
        },
      });
      return Boolean(row);
    },
    async memoryExists(organizationId, executionId) {
      const state = await getAgentOsStateForActor(actor);
      return state.memories.some((record) => {
        const value = asRecord(record.value);
        return record.organizationId === organizationId && value?.sourceReference === executionId && value?.memoryType === "GOAL_OUTCOME" && value?.status === "VERIFIED";
      });
    },
    async remember(input) {
      const state = await getAgentOsStateForActor(actor);
      const value = {
        kind: "business_memory",
        subjectType: "organization",
        memoryType: "GOAL_OUTCOME",
        content: input.content,
        status: "VERIFIED",
        provenance: "VERIFIED_EXECUTION",
        sourceReference: input.executionId,
        conflict: false,
        history: [],
        updatedAt: new Date().toISOString(),
      };
      const record = createMemoryRecord({
        organizationId: input.organizationId,
        scope: "business",
        key: `memory:GOAL_OUTCOME:image:${input.executionId}`,
        value,
      });
      await putAgentOsStateForActor(actor, { ...state, memories: [...state.memories, record] });
      return record.id;
    },
    async markCurrent(input) {
      const rows = await prisma.agentGovernedExecution.findMany({
        where: {
          organizationId: input.organizationId,
          capabilityId: "MARKETING_CREATE_IMAGE",
          businessGoalId: input.goalId,
          planId: input.planId,
          status: "COMPLETED",
        },
      });
      for (const row of rows) {
        const outcome = asRecord(row.outcome) ?? {};
        if (outcome.day !== input.day || outcome.approval !== "approved") continue;
        const current = row.executionId === input.executionId;
        if (outcome.current === current) continue;
        await prisma.agentGovernedExecution.update({
          where: { id: row.id },
          data: { outcome: { ...outcome, current } as Prisma.InputJsonValue },
        });
      }
    },
  };
}

async function loadApprovedItem(actor: Actor, body: {
  readonly goalId: string;
  readonly planId: string;
  readonly planRecordId: string;
  readonly day: number;
  readonly clientOrganizationId?: string;
}) {
  const state = await getAgentOsStateForActor(actor);
  const worker = (state.workers ?? []).find((item) =>
    item.organizationId === actor.organizationId &&
    item.role === "MARKETING" &&
    item.status === "ACTIVE",
  );
  if (!worker || !capabilitiesForRole("MARKETING").includes("MARKETING_CREATE_IMAGE")) {
    return { ok: false as const, status: 403, error: "An active Marketing Worker is required." };
  }
  const plan = state.plans.find((item) => item.id === body.planId && item.organizationId === actor.organizationId && item.goalId === body.goalId);
  if (!plan || plan.status === "cancelled") {
    return { ok: false as const, status: 404, error: "Marketing plan was not found." };
  }
  const record = plan.steps.find((step) => step.capabilityId === "MARKETING_RECORD_PLAN");
  const result = asRecord(record?.result);
  const stored = validateStoredMarketingPlan(result?.approvedPlan ?? result?.plan);
  if (!stored.ok || stored.plan.status !== "approved_stored") {
    return { ok: false as const, status: 403, error: "An approved marketing plan is required." };
  }
  const item = stored.plan.contentItems.find((entry) => entry.day === body.day);
  const storedExecution = await prisma.agentGovernedExecution.findFirst({
    where: {
      id: body.planRecordId,
      organizationId: actor.organizationId,
      businessGoalId: body.goalId,
      planId: body.planId,
      capabilityId: "MARKETING_RECORD_PLAN",
      status: "COMPLETED",
    },
  });
  const subscription = await prisma.commercialSubscription.findUnique({ where: { organizationId: actor.organizationId } }).catch(() => null);
  const access = subscription
    ? paidAccessFor({
        organizationId: subscription.organizationId,
        planCode: subscription.planCode as "agxora_base" | "agxora_business" | "agxora_professional",
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }, new Date())
    : "legacy";
  const entitled = canUseCapability({
    planCode: access === "paid" ? (subscription?.planCode as "agxora_base" | "agxora_business" | "agxora_professional") : null,
    capabilityId: "MARKETING_CREATE_IMAGE",
    access,
  });
  const accessDecision = assessMarketingImageAccess({
    actorOrganizationId: actor.organizationId,
    planOrganizationId: plan.organizationId,
    planFound: true,
    planStatus: stored.ok && stored.plan.status === "approved_stored" ? "approved_stored" : "missing",
    itemFound: Boolean(item),
    recordCompleted: Boolean(storedExecution),
    workerActive: true,
    entitled,
    clientOrganizationId: body.clientOrganizationId,
  });
  if (!accessDecision.ok) return accessDecision;
  if (!item) return { ok: false as const, status: 404, error: "Marketing plan item was not found." };
  const context = asRecord(plan.steps.find((step) => step.capabilityId === "MARKETING_LOAD_BUSINESS_CONTEXT")?.result);
  const organizationName = typeof context?.organizationName === "string" && context.organizationName.trim()
    ? context.organizationName.trim()
    : "Organization";
  return { ok: true as const, workerId: worker.id, plan: stored.plan, item, organizationName };
}

function readBody(body: {
  goalId?: unknown;
  planId?: unknown;
  planRecordId?: unknown;
  day?: unknown;
  workerId?: unknown;
  action?: unknown;
  priorExecutionId?: unknown;
  organizationId?: unknown;
  prompt?: unknown;
  objectKey?: unknown;
  bucket?: unknown;
  capability?: unknown;
} | null) {
  void body?.workerId;
  void body?.prompt;
  void body?.objectKey;
  void body?.bucket;
  void body?.capability;
  const goalId = typeof body?.goalId === "string" ? body.goalId.trim() : "";
  const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
  const planRecordId = typeof body?.planRecordId === "string" ? body.planRecordId.trim() : "";
  const day = typeof body?.day === "number" ? body.day : Number.NaN;
  const clientOrganizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : undefined;
  return { goalId, planId, planRecordId, day, clientOrganizationId };
}

export async function generateMarketingImageForActor(actor: Actor, body: Parameters<typeof readBody>[0], mode: "generate" | "regenerate") {
  const action = readMarketingImageAction(body, mode);
  if (!action.ok) return action;
  const fields = readBody(body);
  if (!fields.goalId || !fields.planId || !fields.planRecordId || !Number.isInteger(fields.day)) {
    return { ok: false as const, status: 400, error: "Marketing image fields are required." };
  }
  const loaded = await loadApprovedItem(actor, fields);
  if (!loaded.ok) return loaded;
  const priorExecutionId = action.priorExecutionId;
  if (mode === "regenerate") {
    const prior = await prisma.agentGovernedExecution.findFirst({
      where: {
        executionId: priorExecutionId,
        organizationId: actor.organizationId,
        capabilityId: "MARKETING_CREATE_IMAGE",
      },
    });
    const priorOutcome = asRecord(prior?.outcome);
    if (!prior || !priorMarketingImageMatches({
      actorOrganizationId: actor.organizationId,
      organizationId: prior.organizationId,
      goalId: fields.goalId,
      planId: fields.planId,
      executionGoalId: prior.businessGoalId ?? "",
      executionPlanId: prior.planId ?? "",
      day: fields.day,
      outcomeDay: priorOutcome?.day,
      capabilityId: prior.capabilityId,
    })) {
      return { ok: false as const, status: 404, error: "Marketing image was not found." };
    }
  }
  const blob = getCreativeBlobConfig();
  if (blob.store !== "s3" || !blob.s3) {
    return { ok: false as const, status: 503, error: "Durable image storage is not configured." };
  }
  const imageConfig = getCreativeImageConfig();
  if (imageConfig.provider !== "openai" || !imageConfig.openaiApiKey) {
    return { ok: false as const, status: 503, error: "The image provider is not available." };
  }
  const objects = getCreativeBlobStore();
  return runMarketingImage({
    request: {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      workerId: loaded.workerId,
      goalId: fields.goalId,
      planId: fields.planId,
      planRecordId: fields.planRecordId,
      organizationName: loaded.organizationName,
      plan: loaded.plan,
      item: loaded.item,
      mode,
      priorExecutionId,
      durable: true,
    },
    store: dbStore(actor),
    provider: async (call) => {
      const generated = await generateOpenAIImageFromPrompt({
        apiKey: imageConfig.openaiApiKey!,
        model: imageConfig.openaiImageModel,
        baseUrl: imageConfig.openaiBaseUrl,
        prompt: call.prompt,
        size: call.size,
      });
      if (!generated.ok) return { ok: false, reason: generated.reason };
      return { ok: true, image: generated };
    },
    objects: {
      async put(file) {
        const expectedPrefix = `org/${actor.organizationId}/creative/${file.assetId}/`;
        if (!file.key.startsWith(expectedPrefix)) {
          throw new Error("storage_key_rejected");
        }
        await objects.putObject({ key: file.key, bytes: file.bytes, mimeType: file.mimeType });
        await prisma.creativeAsset.upsert({
          where: {
            organizationId_creativeProjectId: {
              organizationId: actor.organizationId,
              creativeProjectId: file.assetId,
            },
          },
          create: {
            id: file.assetId,
            organizationId: actor.organizationId,
            creativeProjectId: file.assetId,
            mimeType: file.mimeType,
            byteSize: file.bytes.byteLength,
            width: file.width,
            height: file.height,
            storageBackend: "object_s3",
            objectBucket: blob.s3?.bucket,
            objectKey: file.key,
            modality: "image",
            providerId: "openai",
            bytes: null,
          },
          update: {
            mimeType: file.mimeType,
            byteSize: file.bytes.byteLength,
            width: file.width,
            height: file.height,
            objectKey: file.key,
            objectBucket: blob.s3?.bucket,
            providerId: "openai",
            bytes: null,
          },
        });
      },
      get: (key) => objects.getObjectBytes(key),
    },
    objectKey: (assetId) => buildCreativeObjectKey({
      organizationId: actor.organizationId,
      creativeProjectId: assetId,
      assetId,
    }),
  });
}

export async function reviewMarketingImageForActor(actor: Actor, executionId: string, decision: "approve" | "reject") {
  const row = await prisma.agentGovernedExecution.findFirst({
    where: { executionId, organizationId: actor.organizationId, capabilityId: "MARKETING_CREATE_IMAGE" },
  });
  if (!row) return { ok: false as const, status: 404, error: "Marketing image was not found." };
  const execution = toExecution(row);
  const key = typeof execution.outcome.objectKey === "string" ? execution.outcome.objectKey : "";
  let bytes: Uint8Array | null = null;
  if (decision === "approve" && key) {
    try {
      bytes = await getCreativeBlobStore().getObjectBytes(key);
    } catch {
      return { ok: false as const, status: 409, error: "Marketing image readback did not match." };
    }
  }
  return decideMarketingImageReview({
    execution,
    organizationId: actor.organizationId,
    decision,
    bytes,
    store: dbStore(actor),
  });
}

export async function readMarketingImagePreview(actor: Actor, executionId: string): Promise<
  | { readonly ok: true; readonly bytes: Uint8Array; readonly mimeType: string }
  | { readonly ok: false; readonly status: number; readonly error: string }
> {
  const row = await prisma.agentGovernedExecution.findFirst({
    where: { executionId, organizationId: actor.organizationId, capabilityId: "MARKETING_CREATE_IMAGE", status: "COMPLETED" },
  });
  if (!row) return { ok: false, status: 404, error: "Marketing image was not found." };
  const outcome = asRecord(row.outcome) ?? {};
  const key = typeof outcome.objectKey === "string" ? outcome.objectKey : "";
  if (!key.startsWith(`org/${actor.organizationId}/`)) {
    return { ok: false, status: 404, error: "Marketing image was not found." };
  }
  const bytes = await getCreativeBlobStore().getObjectBytes(key);
  return { ok: true, bytes, mimeType: typeof outcome.mimeType === "string" ? outcome.mimeType : "image/jpeg" };
}

