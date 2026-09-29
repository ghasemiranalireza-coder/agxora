/**
 * Phase 23 marketing image flow.
 * Reservation happens before the provider call. Replay never calls the provider again.
 */

import { createHash, randomUUID } from "node:crypto";
import type { MarketingContentItem, MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import { buildMarketingImageBrief, marketingImageIdempotencyKey } from "./imageBrief";

export type ImageExecutionStatus = "RESERVED" | "EXECUTING" | "COMPLETED" | "FAILED" | "AMBIGUOUS";
export type ImageApproval = "preview" | "approved" | "rejected";

export interface ImageExecution {
  readonly id: string;
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly businessGoalId: string;
  readonly planId: string;
  readonly workerId: string;
  readonly actorId: string;
  readonly status: ImageExecutionStatus;
  readonly approval: ImageApproval | "none";
  readonly verificationStatus: "pending" | "verified" | "failed";
  readonly outcome: Readonly<Record<string, unknown>>;
}

export interface ImageFlowStore {
  findByKey(organizationId: string, idempotencyKey: string): Promise<ImageExecution | null>;
  insertReserved(row: ImageExecution): Promise<"created" | "exists">;
  update(id: string, patch: Partial<Pick<ImageExecution, "status" | "approval" | "verificationStatus" | "outcome">>): Promise<ImageExecution>;
  appendEvidence(input: {
    readonly execution: ImageExecution;
    readonly action: string;
    readonly status: string;
    readonly metadata: Readonly<Record<string, string>>;
  }): Promise<string>;
  findEvidence(input: {
    readonly organizationId: string;
    readonly executionId: string;
    readonly action: string;
  }): Promise<boolean>;
  remember(input: {
    readonly organizationId: string;
    readonly executionId: string;
    readonly content: string;
  }): Promise<string>;
  memoryExists(organizationId: string, executionId: string): Promise<boolean>;
  markCurrent?(input: {
    readonly organizationId: string;
    readonly goalId: string;
    readonly planId: string;
    readonly day: number;
    readonly executionId: string;
  }): Promise<void>;
}

export interface ImageBytes {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly model: string;
  readonly providerId: "openai";
  readonly simulated: false;
}

export interface ImageProviderCall {
  (input: { readonly prompt: string; readonly size: "1024x1024" | "1024x1536" | "1536x1024"; readonly creativeProjectId: string }): Promise<
    | { readonly ok: true; readonly image: ImageBytes }
    | { readonly ok: false; readonly reason: string }
  >;
}

export interface ImageObjectStore {
  put(input: {
    readonly key: string;
    readonly bytes: Uint8Array;
    readonly mimeType: string;
    readonly width: number;
    readonly height: number;
    readonly assetId: string;
  }): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

export interface MarketingImageRequest {
  readonly organizationId: string;
  readonly actorId: string;
  readonly workerId: string;
  readonly goalId: string;
  readonly planId: string;
  readonly planRecordId: string;
  readonly organizationName: string;
  readonly plan: MarketingPlanDocument;
  readonly item: MarketingContentItem;
  readonly mode: "generate" | "regenerate";
  readonly priorExecutionId?: string;
  readonly durable: boolean;
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function publicOutcome(row: ImageExecution) {
  return {
    executionId: row.executionId,
    executionRowId: row.id,
    status: row.status,
    approval: row.approval,
    verificationStatus: row.verificationStatus,
    assetId: typeof row.outcome.assetId === "string" ? row.outcome.assetId : undefined,
    previewPath: typeof row.outcome.previewPath === "string" ? row.outcome.previewPath : undefined,
    providerId: row.outcome.providerId === "openai" ? "openai" : undefined,
    model: typeof row.outcome.model === "string" ? row.outcome.model : undefined,
    simulated: row.outcome.simulated === false ? false as const : true,
    replayed: false,
    published: false as const,
    current: row.outcome.current === true,
    day: row.outcome.day,
  };
}

const TERMINAL = new Set<ImageExecutionStatus>(["COMPLETED", "FAILED", "AMBIGUOUS"]);

async function waitForTerminal(
  store: ImageFlowStore,
  organizationId: string,
  idempotencyKey: string,
): Promise<ImageExecution | null> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const row = await store.findByKey(organizationId, idempotencyKey);
    if (!row) return null;
    if (TERMINAL.has(row.status)) return row;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return store.findByKey(organizationId, idempotencyKey);
}

function replayResult(row: ImageExecution) {
  return { ok: true as const, replayed: true, result: { ...publicOutcome(row), replayed: true } };
}

export async function runMarketingImage(input: {
  readonly request: MarketingImageRequest;
  readonly store: ImageFlowStore;
  readonly provider: ImageProviderCall;
  readonly objects: ImageObjectStore;
  readonly objectKey: (assetId: string) => string;
}): Promise<
  | { readonly ok: true; readonly replayed: boolean; readonly result: ReturnType<typeof publicOutcome> }
  | { readonly ok: false; readonly status: number; readonly error: string; readonly ambiguous?: boolean }
> {
  const request = input.request;
  if (request.plan.status !== "approved_stored") {
    return { ok: false, status: 403, error: "An approved marketing plan is required." };
  }
  if (!request.durable) {
    return { ok: false, status: 503, error: "Durable image storage is not configured." };
  }
  const idempotencyKey = marketingImageIdempotencyKey({
    organizationId: request.organizationId,
    goalId: request.goalId,
    planId: request.planId,
    day: request.item.day,
    mode: request.mode,
    priorExecutionId: request.priorExecutionId,
  });
  const existing = await input.store.findByKey(request.organizationId, idempotencyKey);
  if (existing) {
    const settled = TERMINAL.has(existing.status) ? existing : await waitForTerminal(input.store, request.organizationId, idempotencyKey);
    if (settled && TERMINAL.has(settled.status)) return replayResult(settled);
    return { ok: false, status: 409, error: "This image is already being created." };
  }

  const executionId = randomUUID();
  const assetId = `mktimg_${randomUUID().replace(/-/g, "")}`;
  const reserved: ImageExecution = {
    id: randomUUID(),
    organizationId: request.organizationId,
    idempotencyKey,
    executionId,
    businessGoalId: request.goalId,
    planId: request.planId,
    workerId: request.workerId,
    actorId: request.actorId,
    status: "RESERVED",
    approval: "none",
    verificationStatus: "pending",
    outcome: {
      day: request.item.day,
      planRecordId: request.planRecordId,
      mode: request.mode,
      priorExecutionId: request.priorExecutionId ?? "",
    },
  };
  const inserted = await input.store.insertReserved(reserved);
  const row = inserted === "created" ? reserved : await input.store.findByKey(request.organizationId, idempotencyKey);
  if (!row) return { ok: false, status: 409, error: "This image is already being created." };
  if (inserted === "exists") {
    const settled = TERMINAL.has(row.status) ? row : await waitForTerminal(input.store, request.organizationId, idempotencyKey);
    if (settled && TERMINAL.has(settled.status)) return replayResult(settled);
    return { ok: false, status: 409, error: "This image is already being created." };
  }

  const brief = buildMarketingImageBrief({
    organizationName: request.organizationName,
    plan: request.plan,
    item: request.item,
  });
  await input.store.update(row.id, { status: "EXECUTING" });
  const generated = await input.provider({
    prompt: brief.prompt,
    size: brief.size,
    creativeProjectId: assetId,
  });
  if (!generated.ok) {
    const failed = await input.store.update(row.id, {
      status: "FAILED",
      outcome: { ...row.outcome, reason: generated.reason, providerId: "openai", simulated: false },
    });
    await input.store.appendEvidence({
      execution: failed,
      action: "marketing.image.failed",
      status: "failed",
      metadata: { reason: generated.reason },
    });
    return { ok: true, replayed: false, result: { ...publicOutcome(failed), replayed: false } };
  }

  const key = input.objectKey(assetId);
  const digest = hashBytes(generated.image.bytes);
  try {
    await input.objects.put({
      key,
      bytes: generated.image.bytes,
      mimeType: generated.image.mimeType,
      width: generated.image.width,
      height: generated.image.height,
      assetId,
    });
  } catch {
    const ambiguous = await input.store.update(row.id, {
      status: "AMBIGUOUS",
      outcome: {
        ...row.outcome,
        providerId: "openai",
        model: generated.image.model,
        simulated: false,
        reason: "storage_failed",
      },
    });
    await input.store.appendEvidence({
      execution: ambiguous,
      action: "marketing.image.storage_failed",
      status: "ambiguous",
      metadata: { model: generated.image.model },
    });
    return { ok: false, status: 409, error: "The image was created but storage did not finish.", ambiguous: true };
  }

  const completed = await input.store.update(row.id, {
    status: "COMPLETED",
    approval: "preview",
    outcome: {
      ...row.outcome,
      assetId,
      objectKey: key,
      mimeType: generated.image.mimeType,
      byteSize: generated.image.bytes.byteLength,
      width: generated.image.width,
      height: generated.image.height,
      sha256: digest,
      providerId: "openai",
      model: generated.image.model,
      simulated: false,
      previewPath: `/api/v1/agents/marketing/image/preview?executionId=${executionId}`,
      published: false,
    },
  });
  await input.store.appendEvidence({
    execution: completed,
    action: "marketing.image.preview",
    status: "preview",
    metadata: {
      assetId,
      providerId: "openai",
      model: generated.image.model,
      sha256: digest,
      day: String(request.item.day),
    },
  });
  return { ok: true, replayed: false, result: publicOutcome(completed) };
}

export async function decideMarketingImageReview(input: {
  readonly execution: ImageExecution;
  readonly organizationId: string;
  readonly decision: "approve" | "reject";
  readonly bytes: Uint8Array | null;
  readonly store: ImageFlowStore;
}): Promise<{ readonly ok: true; readonly result: ReturnType<typeof publicOutcome> } | { readonly ok: false; readonly status: number; readonly error: string }> {
  const row = input.execution;
  if (row.organizationId !== input.organizationId) {
    return { ok: false, status: 404, error: "Marketing image was not found." };
  }
  if (row.status !== "COMPLETED" || row.approval === "none") {
    return { ok: false, status: 409, error: "This image is not ready for review." };
  }
  if (row.approval === "approved" || row.approval === "rejected") {
    if ((row.approval === "approved" && input.decision === "approve") || (row.approval === "rejected" && input.decision === "reject")) {
      return { ok: true, result: { ...publicOutcome(row), replayed: true } };
    }
    return { ok: false, status: 409, error: "This image review is already finished." };
  }
  if (input.decision === "reject") {
    const rejected = await input.store.update(row.id, { approval: "rejected", verificationStatus: "failed" });
    await input.store.appendEvidence({
      execution: rejected,
      action: "marketing.image.rejected",
      status: "rejected",
      metadata: { assetId: String(row.outcome.assetId ?? "") },
    });
    return { ok: true, result: publicOutcome(rejected) };
  }
  const expected = typeof row.outcome.sha256 === "string" ? row.outcome.sha256 : "";
  const objectKey = typeof row.outcome.objectKey === "string" ? row.outcome.objectKey : "";
  const day = row.outcome.day;
  if (!objectKey.startsWith(`org/${input.organizationId}/creative/`)) {
    return { ok: false, status: 409, error: "Marketing image storage is not valid." };
  }
  if (typeof day !== "number" || !row.businessGoalId || !row.planId) {
    return { ok: false, status: 409, error: "Marketing image context is incomplete." };
  }
  if (!input.bytes || hashBytes(input.bytes) !== expected) {
    return { ok: false, status: 409, error: "Marketing image readback did not match." };
  }
  if (row.outcome.providerId !== "openai" || row.outcome.simulated !== false) {
    return { ok: false, status: 409, error: "Marketing image provider metadata is not valid." };
  }
  const previewRecorded = await input.store.findEvidence({
    organizationId: row.organizationId,
    executionId: row.executionId,
    action: "marketing.image.preview",
  });
  if (!previewRecorded) {
    return { ok: false, status: 409, error: "Marketing image evidence is missing." };
  }
  const approved = await input.store.update(row.id, {
    approval: "approved",
    verificationStatus: "verified",
    outcome: { ...row.outcome, current: true },
  });
  await input.store.appendEvidence({
    execution: approved,
    action: "marketing.image.verified",
    status: "verified",
    metadata: {
      assetId: String(row.outcome.assetId ?? ""),
      sha256: expected,
      goalId: row.businessGoalId,
      planId: row.planId,
      day: String(row.outcome.day ?? ""),
    },
  });
  if (input.store.markCurrent) {
    await input.store.markCurrent({
      organizationId: row.organizationId,
      goalId: row.businessGoalId,
      planId: row.planId,
      day,
      executionId: row.executionId,
    });
  }
  if (!(await input.store.memoryExists(row.organizationId, row.executionId))) {
    const day = String(row.outcome.day ?? "");
    await input.store.remember({
      organizationId: row.organizationId,
      executionId: row.executionId,
      content: `An approved marketing image exists for day ${day} of this marketing plan. Nothing has been published.`,
    });
  }
  return { ok: true, result: publicOutcome(approved) };
}
