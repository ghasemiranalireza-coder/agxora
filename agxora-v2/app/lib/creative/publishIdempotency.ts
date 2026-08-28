/**
 * Phase 63.1 — creative publish idempotency lock (Prisma-backed).
 */

import "server-only";

import { createHash, randomUUID } from "crypto";
import type { CreativePublishAttemptStatus } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { CreativePublishResult } from "@/features/agents/creative/types";
import { PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS } from "../social/config";

export type PublishAttemptRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly publishExecutionJobId: string;
  readonly creativeProjectId: string;
  readonly assetId: string;
  readonly platform: string;
  readonly status: CreativePublishAttemptStatus;
  readonly publishResult?: CreativePublishResult;
  readonly externalId?: string;
  readonly errorReason?: string;
  readonly expiresAt: Date;
};

export type PublishAttemptAcquireInput = {
  readonly organizationId: string;
  readonly publishExecutionJobId: string;
  readonly creativeProjectId: string;
  readonly assetId: string;
  readonly platform: string;
};

export type PublishAttemptAcquireResult =
  | { readonly kind: "acquired"; readonly attemptId: string }
  | {
      readonly kind: "replay";
      readonly publishResult: CreativePublishResult;
      readonly externalId?: string;
    }
  | { readonly kind: "conflict" }
  | {
      readonly kind: "requires_new_job";
      readonly reason: string;
    };

export type PublishAttemptCompleteInput = {
  readonly attemptId: string;
  readonly organizationId: string;
  readonly status: CreativePublishAttemptStatus;
  readonly publishResult: CreativePublishResult;
  readonly externalId?: string;
  readonly errorReason?: string;
};

export function buildPublishIdempotencyKey(input: PublishAttemptAcquireInput): string {
  return createHash("sha256")
    .update(
      [
        input.organizationId,
        input.publishExecutionJobId,
        input.creativeProjectId,
        input.assetId,
        input.platform,
      ].join("::"),
      "utf8",
    )
    .digest("hex");
}

function toCreativePublishResult(value: unknown): CreativePublishResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as CreativePublishResult;
  if (typeof record.published !== "boolean") return null;
  return record;
}

type PublishAttemptStore = {
  acquire(input: PublishAttemptAcquireInput): Promise<PublishAttemptAcquireResult>;
  complete(input: PublishAttemptCompleteInput): Promise<void>;
  getById(organizationId: string, attemptId: string): Promise<PublishAttemptRecord | null>;
  getByJobId(
    organizationId: string,
    publishExecutionJobId: string,
  ): Promise<PublishAttemptRecord | null>;
};

const memoryAttempts = new Map<
  string,
  {
    id: string;
    organizationId: string;
    publishExecutionJobId: string;
    creativeProjectId: string;
    assetId: string;
    platform: string;
    idempotencyKey: string;
    status: CreativePublishAttemptStatus;
    publishResult?: CreativePublishResult;
    externalId?: string;
    errorReason?: string;
    expiresAt: Date;
  }
>();

function attemptKey(organizationId: string, publishExecutionJobId: string): string {
  return `${organizationId}::${publishExecutionJobId}`;
}

function evaluateExistingAttempt(row: {
  status: CreativePublishAttemptStatus;
  publishResult?: unknown | null;
  externalId?: string | null;
  expiresAt: Date;
}): PublishAttemptAcquireResult {
  if (row.status === "succeeded") {
    const publishResult = toCreativePublishResult(row.publishResult);
    if (publishResult) {
      return {
        kind: "replay",
        publishResult,
        externalId: row.externalId ?? undefined,
      };
    }
  }
  if (row.status === "uploading") {
    const publishResult = toCreativePublishResult(row.publishResult);
    if (publishResult) {
      return {
        kind: "replay",
        publishResult,
        externalId: row.externalId ?? undefined,
      };
    }
    if (row.expiresAt.getTime() > Date.now()) {
      return { kind: "conflict" };
    }
    return { kind: "acquired", attemptId: "reclaim_uploading" };
  }
  if (row.status === "in_flight") {
    if (row.expiresAt.getTime() > Date.now()) {
      return { kind: "conflict" };
    }
    return { kind: "acquired", attemptId: "reclaim" };
  }
  if (row.status === "failed" && !row.externalId) {
    return { kind: "requires_new_job", reason: "failed_without_external_id" };
  }
  if (row.status === "unavailable") {
    return { kind: "acquired", attemptId: "reclaim_unavailable" };
  }
  return { kind: "requires_new_job", reason: row.status };
}

function mapMemoryRow(row: {
  id: string;
  organizationId: string;
  publishExecutionJobId: string;
  creativeProjectId: string;
  assetId: string;
  platform: string;
  status: CreativePublishAttemptStatus;
  publishResult?: CreativePublishResult;
  externalId?: string;
  errorReason?: string;
  expiresAt: Date;
}): PublishAttemptRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    publishExecutionJobId: row.publishExecutionJobId,
    creativeProjectId: row.creativeProjectId,
    assetId: row.assetId,
    platform: row.platform,
    status: row.status,
    publishResult: row.publishResult,
    externalId: row.externalId,
    errorReason: row.errorReason,
    expiresAt: row.expiresAt,
  };
}

const databasePublishAttemptStore: PublishAttemptStore = {
  async acquire(input) {
    const idempotencyKey = buildPublishIdempotencyKey(input);
    const expiresAt = new Date(Date.now() + PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS);
    try {
      const created = await prisma.creativePublishAttempt.create({
        data: {
          id: randomUUID(),
          organizationId: input.organizationId,
          publishExecutionJobId: input.publishExecutionJobId,
          creativeProjectId: input.creativeProjectId,
          assetId: input.assetId,
          platform: input.platform,
          idempotencyKey,
          status: "in_flight",
          expiresAt,
        },
      });
      return { kind: "acquired", attemptId: created.id };
    } catch {
      const existing = await prisma.creativePublishAttempt.findUnique({
        where: {
          organizationId_publishExecutionJobId: {
            organizationId: input.organizationId,
            publishExecutionJobId: input.publishExecutionJobId,
          },
        },
      });
      if (!existing) {
        throw new PersistenceError("persistence", "Failed to acquire publish attempt lock");
      }
      const decision = evaluateExistingAttempt(existing);
      if (decision.kind === "acquired") {
        const reclaimed = await prisma.creativePublishAttempt.update({
          where: { id: existing.id },
          data: {
            status: "in_flight",
            expiresAt,
            startedAt: new Date(),
            completedAt: null,
            publishResult: undefined,
            externalId: null,
            errorReason: null,
            assetId: input.assetId,
            platform: input.platform,
            idempotencyKey,
            creativeProjectId: input.creativeProjectId,
          },
        });
        return { kind: "acquired", attemptId: reclaimed.id };
      }
      return decision;
    }
  },

  async complete(input) {
    await prisma.creativePublishAttempt.updateMany({
      where: {
        id: input.attemptId,
        organizationId: input.organizationId,
      },
      data: {
        status: input.status,
        publishResult: input.publishResult as object,
        externalId: input.externalId ?? null,
        errorReason: input.errorReason ?? null,
        completedAt: input.status === "uploading" ? null : new Date(),
      },
    });
  },

  async getById(organizationId, attemptId) {
    const row = await prisma.creativePublishAttempt.findFirst({
      where: { id: attemptId, organizationId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          publishExecutionJobId: row.publishExecutionJobId,
          creativeProjectId: row.creativeProjectId,
          assetId: row.assetId,
          platform: row.platform,
          status: row.status,
          publishResult: toCreativePublishResult(row.publishResult) ?? undefined,
          externalId: row.externalId ?? undefined,
          errorReason: row.errorReason ?? undefined,
          expiresAt: row.expiresAt,
        }
      : null;
  },

  async getByJobId(organizationId, publishExecutionJobId) {
    const row = await prisma.creativePublishAttempt.findUnique({
      where: {
        organizationId_publishExecutionJobId: {
          organizationId,
          publishExecutionJobId,
        },
      },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          publishExecutionJobId: row.publishExecutionJobId,
          creativeProjectId: row.creativeProjectId,
          assetId: row.assetId,
          platform: row.platform,
          status: row.status,
          publishResult: toCreativePublishResult(row.publishResult) ?? undefined,
          externalId: row.externalId ?? undefined,
          errorReason: row.errorReason ?? undefined,
          expiresAt: row.expiresAt,
        }
      : null;
  },
};

const memoryPublishAttemptStore: PublishAttemptStore = {
  async acquire(input) {
    const key = attemptKey(input.organizationId, input.publishExecutionJobId);
    const existing = memoryAttempts.get(key);
    if (existing) {
      const decision = evaluateExistingAttempt(existing);
      if (decision.kind !== "acquired") return decision;
      const attemptId = randomUUID();
      memoryAttempts.set(key, {
        ...existing,
        id: attemptId,
        status: "in_flight",
        expiresAt: new Date(Date.now() + PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS),
        publishResult: undefined,
        externalId: undefined,
        errorReason: undefined,
      });
      return { kind: "acquired", attemptId };
    }
    const attemptId = randomUUID();
    memoryAttempts.set(key, {
      id: attemptId,
      organizationId: input.organizationId,
      publishExecutionJobId: input.publishExecutionJobId,
      creativeProjectId: input.creativeProjectId,
      assetId: input.assetId,
      platform: input.platform,
      idempotencyKey: buildPublishIdempotencyKey(input),
      status: "in_flight",
      expiresAt: new Date(Date.now() + PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS),
    });
    return { kind: "acquired", attemptId };
  },
  async complete(input) {
    for (const [key, row] of memoryAttempts.entries()) {
      if (row.id === input.attemptId && row.organizationId === input.organizationId) {
        memoryAttempts.set(key, {
          ...row,
          status: input.status,
          publishResult: input.publishResult,
          externalId: input.externalId,
          errorReason: input.errorReason,
        });
        return;
      }
    }
  },
  async getById(organizationId, attemptId) {
    for (const row of memoryAttempts.values()) {
      if (row.id === attemptId && row.organizationId === organizationId) {
        return mapMemoryRow(row);
      }
    }
    return null;
  },
  async getByJobId(organizationId, publishExecutionJobId) {
    const row = memoryAttempts.get(attemptKey(organizationId, publishExecutionJobId));
    return row ? mapMemoryRow(row) : null;
  },
};

let storeOverride: PublishAttemptStore | null = null;

function resolveStore(): PublishAttemptStore {
  if (storeOverride) return storeOverride;
  if (process.env.NODE_ENV === "test") return memoryPublishAttemptStore;
  return databasePublishAttemptStore;
}

export function setPublishAttemptStoreForTests(store: PublishAttemptStore | null): void {
  storeOverride = store;
  if (store === null) memoryAttempts.clear();
}

/** Test-only seed for idempotency edge cases (memory store). */
export function seedMemoryPublishAttemptForTests(input: {
  readonly organizationId: string;
  readonly publishExecutionJobId: string;
  readonly creativeProjectId?: string;
  readonly assetId?: string;
  readonly platform?: string;
  readonly status: CreativePublishAttemptStatus;
  readonly expiresAt: Date;
  readonly externalId?: string;
  readonly publishResult?: CreativePublishResult;
}): void {
  const key = attemptKey(input.organizationId, input.publishExecutionJobId);
  memoryAttempts.set(key, {
    id: randomUUID(),
    organizationId: input.organizationId,
    publishExecutionJobId: input.publishExecutionJobId,
    creativeProjectId: input.creativeProjectId ?? "creative_test",
    assetId: input.assetId ?? "asset_test",
    platform: input.platform ?? "youtube",
    idempotencyKey: buildPublishIdempotencyKey({
      organizationId: input.organizationId,
      publishExecutionJobId: input.publishExecutionJobId,
      creativeProjectId: input.creativeProjectId ?? "creative_test",
      assetId: input.assetId ?? "asset_test",
      platform: input.platform ?? "youtube",
    }),
    status: input.status,
    expiresAt: input.expiresAt,
    externalId: input.externalId,
    publishResult: input.publishResult,
    errorReason: undefined,
  });
}

export async function acquireCreativePublishAttempt(
  input: PublishAttemptAcquireInput,
): Promise<PublishAttemptAcquireResult> {
  return resolveStore().acquire(input);
}

export async function completeCreativePublishAttempt(
  input: PublishAttemptCompleteInput,
): Promise<void> {
  await resolveStore().complete(input);
}

export async function getCreativePublishAttemptById(
  organizationId: string,
  attemptId: string,
): Promise<PublishAttemptRecord | null> {
  return resolveStore().getById(organizationId, attemptId);
}

export async function getCreativePublishAttemptByJobId(
  organizationId: string,
  publishExecutionJobId: string,
): Promise<PublishAttemptRecord | null> {
  return resolveStore().getByJobId(organizationId, publishExecutionJobId);
}

export function mapPublishResultToAttemptStatus(
  publishResult: CreativePublishResult,
): CreativePublishAttemptStatus {
  if (publishResult.published) return "succeeded";
  if (publishResult.status === "uploading") return "uploading";
  if (publishResult.status === "failed") return "failed";
  return "unavailable";
}
