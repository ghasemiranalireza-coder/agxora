/**
 * Phase 65.0 — YouTube cross-request upload session persistence (encrypted URL, no tokens).
 */

import "server-only";

import { randomUUID } from "crypto";
import type { CreativeYouTubeUploadSessionStatus } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { encryptSocialSecret, decryptSocialSecret } from "@/app/lib/social/crypto";
import {
  getYouTubeUploadSessionLeaseMs,
  getYouTubeUploadSessionTtlMs,
} from "@/app/lib/social/config";

export type YouTubeUploadSessionRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly publishAttemptId: string;
  readonly publishExecutionJobId: string;
  readonly creativeProjectId: string;
  readonly assetId: string;
  readonly objectKey: string;
  readonly actorUserId: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly byteOffset: number;
  readonly status: CreativeYouTubeUploadSessionStatus;
  readonly workerClaimId: string | null;
  readonly leaseExpiresAt: Date | null;
  readonly expiresAt: Date;
  readonly errorReason: string | null;
  readonly externalId: string | null;
};

export type CreateYouTubeUploadSessionInput = {
  readonly organizationId: string;
  readonly publishAttemptId: string;
  readonly publishExecutionJobId: string;
  readonly creativeProjectId: string;
  readonly assetId: string;
  readonly objectKey: string;
  readonly actorUserId: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly resumableUploadUrl: string;
};

type SessionStore = {
  create(input: CreateYouTubeUploadSessionInput): Promise<YouTubeUploadSessionRecord>;
  findByAttemptId(
    organizationId: string,
    publishAttemptId: string,
  ): Promise<YouTubeUploadSessionRecord | null>;
  findByPublishJob(
    organizationId: string,
    publishExecutionJobId: string,
  ): Promise<YouTubeUploadSessionRecord | null>;
  updateProgress(input: {
    readonly sessionId: string;
    readonly organizationId: string;
    readonly byteOffset: number;
    readonly status?: CreativeYouTubeUploadSessionStatus;
  }): Promise<YouTubeUploadSessionRecord>;
  claimDueSessions(input: {
    readonly limit: number;
    readonly claimId: string;
    readonly now: Date;
  }): Promise<readonly YouTubeUploadSessionRecord[]>;
  complete(input: {
    readonly sessionId: string;
    readonly organizationId: string;
    readonly externalId: string;
  }): Promise<YouTubeUploadSessionRecord>;
  fail(input: {
    readonly sessionId: string;
    readonly organizationId: string;
    readonly errorReason: string;
  }): Promise<YouTubeUploadSessionRecord>;
  expireStale(now: Date): Promise<number>;
};

type MemoryRow = YouTubeUploadSessionRecord & { readonly encryptedResumableUrl: string };

function encryptUploadUrl(url: string): string {
  return encryptSocialSecret(url);
}

function decryptUploadUrl(encrypted: string): string {
  return decryptSocialSecret(encrypted);
}

function mapRow(row: MemoryRow): YouTubeUploadSessionRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    publishAttemptId: row.publishAttemptId,
    publishExecutionJobId: row.publishExecutionJobId,
    creativeProjectId: row.creativeProjectId,
    assetId: row.assetId,
    objectKey: row.objectKey,
    actorUserId: row.actorUserId,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    byteOffset: row.byteOffset,
    status: row.status,
    workerClaimId: row.workerClaimId,
    leaseExpiresAt: row.leaseExpiresAt,
    expiresAt: row.expiresAt,
    errorReason: row.errorReason,
    externalId: row.externalId,
  };
}

const memorySessions = new Map<string, MemoryRow>();

const memorySessionStore: SessionStore = {
  async create(input) {
    const id = randomUUID();
    const row: MemoryRow = {
      id,
      organizationId: input.organizationId,
      publishAttemptId: input.publishAttemptId,
      publishExecutionJobId: input.publishExecutionJobId,
      creativeProjectId: input.creativeProjectId,
      assetId: input.assetId,
      objectKey: input.objectKey,
      actorUserId: input.actorUserId,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      byteOffset: 0,
      encryptedResumableUrl: encryptUploadUrl(input.resumableUploadUrl),
      status: "pending",
      workerClaimId: null,
      leaseExpiresAt: null,
      expiresAt: new Date(Date.now() + getYouTubeUploadSessionTtlMs()),
      errorReason: null,
      externalId: null,
    };
    memorySessions.set(id, row);
    return mapRow(row);
  },
  async findByAttemptId(organizationId, publishAttemptId) {
    for (const row of memorySessions.values()) {
      if (
        row.organizationId === organizationId &&
        row.publishAttemptId === publishAttemptId
      ) {
        return mapRow(row);
      }
    }
    return null;
  },
  async findByPublishJob(organizationId, publishExecutionJobId) {
    for (const row of memorySessions.values()) {
      if (
        row.organizationId === organizationId &&
        row.publishExecutionJobId === publishExecutionJobId
      ) {
        return mapRow(row);
      }
    }
    return null;
  },
  async updateProgress(input) {
    const row = memorySessions.get(input.sessionId);
    if (!row || row.organizationId !== input.organizationId) {
      throw new PersistenceError("not_found", "Upload session not found");
    }
    const next: MemoryRow = {
      ...row,
      byteOffset: input.byteOffset,
      status: input.status ?? row.status,
      workerClaimId: null,
      leaseExpiresAt: null,
    };
    memorySessions.set(input.sessionId, next);
    return mapRow(next);
  },
  async claimDueSessions(input) {
    const leaseMs = getYouTubeUploadSessionLeaseMs();
    const claimed: YouTubeUploadSessionRecord[] = [];
    for (const row of memorySessions.values()) {
      if (claimed.length >= input.limit) break;
      if (row.expiresAt.getTime() <= input.now.getTime()) continue;
      if (row.status !== "pending" && row.status !== "uploading") continue;
      if (row.byteOffset >= row.byteSize) continue;
      if (row.leaseExpiresAt && row.leaseExpiresAt.getTime() > input.now.getTime()) continue;
      const next: MemoryRow = {
        ...row,
        status: "uploading",
        workerClaimId: input.claimId,
        leaseExpiresAt: new Date(input.now.getTime() + leaseMs),
      };
      memorySessions.set(row.id, next);
      claimed.push(mapRow(next));
    }
    return claimed;
  },
  async complete(input) {
    const row = memorySessions.get(input.sessionId);
    if (!row || row.organizationId !== input.organizationId) {
      throw new PersistenceError("not_found", "Upload session not found");
    }
    const next: MemoryRow = {
      ...row,
      status: "completed",
      externalId: input.externalId,
      byteOffset: row.byteSize,
      workerClaimId: null,
      leaseExpiresAt: null,
    };
    memorySessions.set(input.sessionId, next);
    return mapRow(next);
  },
  async fail(input) {
    const row = memorySessions.get(input.sessionId);
    if (!row || row.organizationId !== input.organizationId) {
      throw new PersistenceError("not_found", "Upload session not found");
    }
    const next: MemoryRow = {
      ...row,
      status: "failed",
      errorReason: input.errorReason,
      workerClaimId: null,
      leaseExpiresAt: null,
    };
    memorySessions.set(input.sessionId, next);
    return mapRow(next);
  },
  async expireStale(now) {
    let count = 0;
    for (const [id, row] of memorySessions.entries()) {
      if (
        row.expiresAt.getTime() <= now.getTime() &&
        row.status !== "completed" &&
        row.status !== "failed"
      ) {
        memorySessions.set(id, {
          ...row,
          status: "expired",
          errorReason: "youtube_upload_session_expired",
          workerClaimId: null,
          leaseExpiresAt: null,
        });
        count += 1;
      }
    }
    return count;
  },
};

const databaseSessionStore: SessionStore = {
  async create(input) {
    const row = await prisma.creativeYouTubeUploadSession.create({
      data: {
        organizationId: input.organizationId,
        publishAttemptId: input.publishAttemptId,
        publishExecutionJobId: input.publishExecutionJobId,
        creativeProjectId: input.creativeProjectId,
        assetId: input.assetId,
        objectKey: input.objectKey,
        actorUserId: input.actorUserId,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        encryptedResumableUrl: encryptUploadUrl(input.resumableUploadUrl),
        status: "pending",
        expiresAt: new Date(Date.now() + getYouTubeUploadSessionTtlMs()),
      },
    });
    return mapRow({ ...row, encryptedResumableUrl: row.encryptedResumableUrl });
  },
  async findByAttemptId(organizationId, publishAttemptId) {
    const row = await prisma.creativeYouTubeUploadSession.findFirst({
      where: { organizationId, publishAttemptId },
    });
    return row ? mapRow({ ...row, encryptedResumableUrl: row.encryptedResumableUrl }) : null;
  },
  async findByPublishJob(organizationId, publishExecutionJobId) {
    const row = await prisma.creativeYouTubeUploadSession.findFirst({
      where: { organizationId, publishExecutionJobId },
    });
    return row ? mapRow({ ...row, encryptedResumableUrl: row.encryptedResumableUrl }) : null;
  },
  async updateProgress(input) {
    const row = await prisma.creativeYouTubeUploadSession.update({
      where: { id: input.sessionId, organizationId: input.organizationId },
      data: {
        byteOffset: input.byteOffset,
        status: input.status,
        workerClaimId: null,
        leaseExpiresAt: null,
      },
    });
    return mapRow({ ...row, encryptedResumableUrl: row.encryptedResumableUrl });
  },
  async claimDueSessions(input) {
    const leaseMs = getYouTubeUploadSessionLeaseMs();
    const due = await prisma.creativeYouTubeUploadSession.findMany({
      where: {
        status: { in: ["pending", "uploading"] },
        expiresAt: { gt: input.now },
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: input.now } }],
      },
      orderBy: { createdAt: "asc" },
      take: input.limit * 3,
    });

    const claimed: YouTubeUploadSessionRecord[] = [];
    for (const row of due) {
      if (claimed.length >= input.limit) break;
      if (row.byteOffset >= row.byteSize) continue;
      const updated = await prisma.creativeYouTubeUploadSession.updateMany({
        where: {
          id: row.id,
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: input.now } }],
          status: { in: ["pending", "uploading"] },
        },
        data: {
          status: "uploading",
          workerClaimId: input.claimId,
          leaseExpiresAt: new Date(input.now.getTime() + leaseMs),
        },
      });
      if (updated.count === 1) {
        const fresh = await prisma.creativeYouTubeUploadSession.findUnique({
          where: { id: row.id },
        });
        if (fresh) {
          claimed.push(
            mapRow({ ...fresh, encryptedResumableUrl: fresh.encryptedResumableUrl }),
          );
        }
      }
    }
    return claimed;
  },
  async complete(input) {
    const existing = await prisma.creativeYouTubeUploadSession.findUnique({
      where: { id: input.sessionId, organizationId: input.organizationId },
    });
    if (!existing) {
      throw new PersistenceError("not_found", "Upload session not found");
    }
    const row = await prisma.creativeYouTubeUploadSession.update({
      where: { id: input.sessionId, organizationId: input.organizationId },
      data: {
        status: "completed",
        externalId: input.externalId,
        byteOffset: existing.byteSize,
        workerClaimId: null,
        leaseExpiresAt: null,
        completedAt: new Date(),
      },
    });
    return mapRow({ ...row, encryptedResumableUrl: row.encryptedResumableUrl });
  },
  async fail(input) {
    const row = await prisma.creativeYouTubeUploadSession.update({
      where: { id: input.sessionId, organizationId: input.organizationId },
      data: {
        status: "failed",
        errorReason: input.errorReason,
        workerClaimId: null,
        leaseExpiresAt: null,
      },
    });
    return mapRow({ ...row, encryptedResumableUrl: row.encryptedResumableUrl });
  },
  async expireStale(now) {
    const result = await prisma.creativeYouTubeUploadSession.updateMany({
      where: {
        expiresAt: { lte: now },
        status: { in: ["pending", "uploading"] },
      },
      data: {
        status: "expired",
        errorReason: "youtube_upload_session_expired",
        workerClaimId: null,
        leaseExpiresAt: null,
      },
    });
    return result.count;
  },
};

let storeOverride: SessionStore | null = null;

function resolveStore(): SessionStore {
  if (storeOverride) return storeOverride;
  if (process.env.NODE_ENV === "test") return memorySessionStore;
  return databaseSessionStore;
}

export function setYouTubeUploadSessionStoreForTests(store: SessionStore | null): void {
  storeOverride = store;
  if (store === null) memorySessions.clear();
}

export async function createYouTubeUploadSession(
  input: CreateYouTubeUploadSessionInput,
): Promise<YouTubeUploadSessionRecord> {
  return resolveStore().create(input);
}

export async function findYouTubeUploadSessionByAttempt(
  organizationId: string,
  publishAttemptId: string,
): Promise<YouTubeUploadSessionRecord | null> {
  return resolveStore().findByAttemptId(organizationId, publishAttemptId);
}

export async function findYouTubeUploadSessionByPublishJob(
  organizationId: string,
  publishExecutionJobId: string,
): Promise<YouTubeUploadSessionRecord | null> {
  return resolveStore().findByPublishJob(organizationId, publishExecutionJobId);
}

export async function updateYouTubeUploadSessionProgress(input: {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly byteOffset: number;
  readonly status?: CreativeYouTubeUploadSessionStatus;
}): Promise<YouTubeUploadSessionRecord> {
  return resolveStore().updateProgress(input);
}

export async function claimDueYouTubeUploadSessions(input: {
  readonly limit: number;
  readonly claimId: string;
  readonly now?: Date;
}): Promise<readonly YouTubeUploadSessionRecord[]> {
  return resolveStore().claimDueSessions({
    limit: input.limit,
    claimId: input.claimId,
    now: input.now ?? new Date(),
  });
}

export async function completeYouTubeUploadSession(input: {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly externalId: string;
}): Promise<YouTubeUploadSessionRecord> {
  return resolveStore().complete(input);
}

export async function failYouTubeUploadSession(input: {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly errorReason: string;
}): Promise<YouTubeUploadSessionRecord> {
  return resolveStore().fail(input);
}

export async function expireStaleYouTubeUploadSessions(now = new Date()): Promise<number> {
  return resolveStore().expireStale(now);
}

export async function resolveYouTubeUploadUrl(
  session: YouTubeUploadSessionRecord,
): Promise<string> {
  if (process.env.NODE_ENV === "test") {
    const row = memorySessions.get(session.id);
    if (!row) {
      throw new PersistenceError("not_found", "Upload session not found");
    }
    return decryptUploadUrl(row.encryptedResumableUrl);
  }
  const row = await prisma.creativeYouTubeUploadSession.findUnique({
    where: { id: session.id, organizationId: session.organizationId },
    select: { encryptedResumableUrl: true },
  });
  if (!row) {
    throw new PersistenceError("not_found", "Upload session not found");
  }
  return decryptUploadUrl(row.encryptedResumableUrl);
}

/** Test-only access to encrypted URL for adversarial tests. */
export function getEncryptedUploadUrlForTests(sessionId: string): string | null {
  return memorySessions.get(sessionId)?.encryptedResumableUrl ?? null;
}
