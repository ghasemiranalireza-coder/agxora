/**
 * Decisions for one governed Instagram image publish.
 * No network, no tokens, and no organization chosen by the client.
 */

import { createHash } from "node:crypto";

export const INSTAGRAM_PUBLISH_CAPABILITY = "MARKETING_PUBLISH_INSTAGRAM";

export type PublishExecutionStatus = "RESERVED" | "EXECUTING" | "COMPLETED" | "FAILED" | "AMBIGUOUS";

export interface PublishAccessInput {
  readonly actorOrganizationId: string;
  readonly clientOrganizationId?: string | null;
  readonly workerActive: boolean;
  readonly entitled: boolean;
  readonly configured: boolean;
  readonly planFound: boolean;
  readonly planOrganizationId: string | null;
  readonly planStatus: "draft" | "approved_stored" | "rejected" | "missing";
  readonly channelIntent: string | null;
  readonly itemFound: boolean;
  readonly recordCompleted: boolean;
  readonly claimGatePass: boolean;
  readonly imageApproved: boolean;
  readonly imageOwned: boolean;
  readonly explicitPublish: boolean;
  readonly credentialActive: boolean;
  readonly publishPermission: boolean;
}

export function assessInstagramPublishAccess(
  input: PublishAccessInput,
): { readonly ok: true } | { readonly ok: false; readonly status: number; readonly error: string } {
  if (input.clientOrganizationId && input.clientOrganizationId !== input.actorOrganizationId) {
    return { ok: false, status: 404, error: "Marketing plan was not found." };
  }
  if (!input.configured) {
    return { ok: false, status: 503, error: "Instagram publishing is not configured." };
  }
  if (!input.workerActive) {
    return { ok: false, status: 403, error: "An active Marketing Worker is required." };
  }
  if (!input.entitled) {
    return { ok: false, status: 403, error: "Instagram publishing requires Business or Professional." };
  }
  if (!input.planFound || input.planOrganizationId !== input.actorOrganizationId) {
    return { ok: false, status: 404, error: "Marketing plan was not found." };
  }
  if (input.planStatus !== "approved_stored") {
    return { ok: false, status: 403, error: "An approved marketing plan is required." };
  }
  if (input.channelIntent !== "instagram") {
    return { ok: false, status: 403, error: "This plan is not an Instagram plan." };
  }
  if (!input.recordCompleted || !input.itemFound) {
    return { ok: false, status: 404, error: "Marketing plan item was not found." };
  }
  if (!input.claimGatePass) {
    return { ok: false, status: 403, error: "The claim gate must pass for the current plan." };
  }
  if (!input.imageOwned) {
    return { ok: false, status: 404, error: "Marketing image was not found." };
  }
  if (!input.imageApproved) {
    return { ok: false, status: 403, error: "An approved marketing image is required." };
  }
  if (!input.explicitPublish) {
    return { ok: false, status: 403, error: "Publish to Instagram requires an explicit action." };
  }
  if (!input.credentialActive || !input.publishPermission) {
    return { ok: false, status: 403, error: "Connect an Instagram professional account before publishing." };
  }
  return { ok: true };
}

export function approvedInstagramCaption(draftCopy: string): string {
  return draftCopy;
}

export function instagramPublishIdempotencyKey(input: {
  readonly organizationId: string;
  readonly goalId: string;
  readonly planId: string;
  readonly day: number;
}): string {
  return `mktpub:v1:${input.organizationId}:${input.goalId}:${input.planId}:${input.day}:instagram`;
}

export function retryIdempotencyKey(baseKey: string, failedExecutionId: string): string {
  return `${baseKey}:retry:${failedExecutionId}`;
}

export interface ExistingPublish {
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly status: PublishExecutionStatus;
  readonly containerId?: string;
  readonly mediaId?: string;
}

/**
 * Same key returns the existing execution.
 * A definite FAILED publish can take one new key. AMBIGUOUS never starts another post.
 */
export function decideIdempotentPublish(input: {
  readonly baseKey: string;
  readonly existing: readonly ExistingPublish[];
}): { readonly action: "create"; readonly key: string } | { readonly action: "replay"; readonly existing: ExistingPublish } {
  const base = input.existing.find((row) => row.idempotencyKey === input.baseKey);
  if (!base) return { action: "create", key: input.baseKey };
  if (base.status !== "FAILED") return { action: "replay", existing: base };
  const retryKey = retryIdempotencyKey(input.baseKey, base.executionId);
  const retry = input.existing.find((row) => row.idempotencyKey === retryKey);
  if (!retry) return { action: "create", key: retryKey };
  return { action: "replay", existing: retry };
}

export type ProviderClassification =
  | { readonly kind: "failed"; readonly reason: string }
  | { readonly kind: "ambiguous"; readonly reason: string }
  | { readonly kind: "container"; readonly containerId: string }
  | { readonly kind: "published"; readonly mediaId: string }
  | { readonly kind: "verified"; readonly mediaId: string; readonly permalink?: string };

export function classifyContainerCreate(input: {
  readonly httpStatus: number;
  readonly body: unknown;
  readonly transportError: boolean;
}): { readonly kind: "failed"; readonly reason: string } | { readonly kind: "ambiguous"; readonly reason: string } | { readonly kind: "container"; readonly containerId: string } {
  if (input.transportError) return { kind: "ambiguous", reason: "container_response_lost" };
  if (input.httpStatus >= 500) return { kind: "ambiguous", reason: "container_provider_unavailable" };
  const id = readId(input.body);
  if (input.httpStatus >= 200 && input.httpStatus < 300 && id) return { kind: "container", containerId: id };
  return { kind: "failed", reason: "container_rejected" };
}

export function classifyContainerStatus(
  statusCode: string | null,
  transportError: boolean,
): { readonly kind: "failed"; readonly reason: string } | { readonly kind: "ambiguous"; readonly reason: string } | "ready" | "wait" {
  if (transportError || !statusCode) return { kind: "ambiguous", reason: "container_status_unknown" };
  if (statusCode === "FINISHED") return "ready";
  if (statusCode === "IN_PROGRESS") return "wait";
  if (statusCode === "PUBLISHED") return { kind: "ambiguous", reason: "container_already_published" };
  if (statusCode === "ERROR" || statusCode === "EXPIRED") return { kind: "failed", reason: `container_${statusCode.toLowerCase()}` };
  return { kind: "ambiguous", reason: "container_status_unrecognized" };
}

export function classifyMediaPublish(input: {
  readonly httpStatus: number;
  readonly body: unknown;
  readonly transportError: boolean;
}): { readonly kind: "failed"; readonly reason: string } | { readonly kind: "ambiguous"; readonly reason: string } | { readonly kind: "published"; readonly mediaId: string } {
  if (input.transportError || input.httpStatus >= 500) {
    return { kind: "ambiguous", reason: "publish_response_lost" };
  }
  const id = readId(input.body);
  if (input.httpStatus >= 200 && input.httpStatus < 300 && id) return { kind: "published", mediaId: id };
  return { kind: "failed", reason: "publish_rejected" };
}

export function verifyReadBack(input: {
  readonly expectedAccountId: string;
  readonly expectedUsername: string;
  readonly expectedMediaId: string;
  readonly expectedCaption: string;
  readonly accountId: string | null;
  readonly username: string | null;
  readonly mediaId: string | null;
  readonly caption: string | null;
  readonly permalink: string | null;
}): { readonly ok: true; readonly permalink?: string } | { readonly ok: false; readonly reason: string } {
  if (!input.mediaId || input.mediaId !== input.expectedMediaId) return { ok: false, reason: "media_mismatch" };
  const expectedName = input.expectedUsername.replace(/^@/, "").toLowerCase();
  const actualName = input.username?.replace(/^@/, "").toLowerCase() ?? "";
  if (!actualName || actualName !== expectedName) return { ok: false, reason: "account_mismatch" };
  if (input.accountId && input.accountId !== input.expectedAccountId) return { ok: false, reason: "account_mismatch" };
  if (input.caption === null || input.caption !== input.expectedCaption) return { ok: false, reason: "caption_mismatch" };
  return { ok: true, permalink: input.permalink ?? undefined };
}

export function contentDigest(caption: string): string {
  return createHash("sha256").update(caption).digest("hex");
}

const SECRET_FIELD = /token|secret|password|verifier|credential|authorization/i;

export function safePublishEvidence(input: {
  readonly provider: "instagram";
  readonly externalAccountId: string;
  readonly username: string;
  readonly containerId?: string;
  readonly mediaId?: string;
  readonly permalink?: string;
  readonly contentHash: string;
  readonly publishedAt?: string;
  readonly verificationStatus: string;
}): Record<string, string> {
  const metadata: Record<string, string> = {
    provider: input.provider,
    externalAccountId: input.externalAccountId,
    username: input.username.startsWith("@") ? input.username : `@${input.username}`,
    contentHash: input.contentHash,
    verificationStatus: input.verificationStatus,
  };
  if (input.containerId) metadata.containerId = input.containerId;
  if (input.mediaId) metadata.mediaId = input.mediaId;
  if (input.permalink && input.permalink.startsWith("https://www.instagram.com/")) metadata.permalink = input.permalink;
  if (input.publishedAt) metadata.publishedAt = input.publishedAt;
  for (const key of Object.keys(metadata)) {
    if (SECRET_FIELD.test(key)) delete metadata[key];
  }
  return metadata;
}

function readId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const id = (body as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}
