/**
 * Phase 63.0 — server-side creative publish service.
 * Actor organization is authoritative. Client approvalState/media never authorize.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type {
  CreativePublishResult,
  CreativeProject,
} from "@/features/agents/creative/types";
import { canPublishCompletedCreative } from "@/features/agents/creative/capabilities";
import { authorizeCreativePublishFromState } from "./authorizePublish";
import { loadCreativeAssetBytes } from "./assetStore";
import { invokeSocialAdapterForCreativePublish } from "./invokeSocialPublish";
import { mapCreativeToSocialPublishTarget } from "./platformMap";
import { getStoredPrimaryCreativeAsset } from "./storedPrimaryAsset";

export type ServerCreativePublishInput = {
  readonly creativeProjectId: string;
  /** Ignored for authority — actor.organizationId wins. */
  readonly organizationId?: string;
  /** Informational only. MUST NOT authorize publish. */
  readonly approvalState?: string;
  /** Rejected — server loads asset from store only. */
  readonly assetId?: string;
  /** Rejected — never trust client media URLs. */
  readonly assetUrl?: string;
  readonly publishUrl?: string;
  readonly oauthToken?: string;
  readonly mediaBase64?: string;
};

export type ServerCreativePublishSuccess = {
  readonly ok: true;
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly approvalId: string;
  readonly publishExecutionJobId: string;
  readonly publishResult: CreativePublishResult;
  readonly idempotentReplay: boolean;
};

type LoadStateFn = (actor: Actor) => Promise<AgentsPersistedState>;

let loadStateOverride: LoadStateFn | null = null;

/** Test-only state loader injection (avoids Prisma in unit tests). */
export function setCreativePublishLoadStateForTests(
  loader: LoadStateFn | null,
): void {
  loadStateOverride = loader;
}

function rejectClientMediaOverride(field: string): never {
  throw new PersistenceError("forbidden", "Client-supplied publish media is not authoritative", {
    details: [{ field, message: "client_media_not_authoritative" }],
  });
}

function toPublishResult(
  input: {
    readonly project: CreativeProject;
    readonly target: ReturnType<typeof mapCreativeToSocialPublishTarget>;
    readonly executionJobId: string;
    readonly adapterResult: {
      readonly available: boolean;
      readonly status: "unavailable" | "published" | "scheduled" | "failed";
      readonly published: boolean;
      readonly reason?: string;
      readonly externalId?: string;
    };
    readonly reasonOverride?: string;
  },
): CreativePublishResult {
  const published =
    input.adapterResult.available &&
    input.adapterResult.published &&
    input.adapterResult.status === "published";
  return {
    available: input.adapterResult.available,
    status: published ? "published" : input.adapterResult.status === "failed" ? "failed" : "unavailable",
    published,
    reason: input.reasonOverride ?? input.adapterResult.reason,
    platform: input.target.socialPlatform,
    contentType: input.target.contentType,
    externalId: input.adapterResult.externalId,
    executionJobId: input.executionJobId,
  };
}

/**
 * Publish a COMPLETED creative with durable primary asset through social adapters.
 * Adapters remain unavailable in Phase 63.0 unless explicitly configured in tests.
 */
export async function publishCreativeForActor(
  actor: Actor,
  input: ServerCreativePublishInput,
): Promise<ServerCreativePublishSuccess> {
  if (!input.creativeProjectId?.trim()) {
    throw new PersistenceError("validation", "creativeProjectId is required");
  }

  if (
    typeof input.organizationId === "string" &&
    input.organizationId.length > 0 &&
    input.organizationId !== actor.organizationId
  ) {
    throw new PersistenceError("forbidden", "Organization mismatch", {
      details: [{ field: "organizationId", message: "actor_org_authoritative" }],
    });
  }

  void input.approvalState;
  if (input.assetUrl?.trim()) rejectClientMediaOverride("assetUrl");
  if (input.publishUrl?.trim()) rejectClientMediaOverride("publishUrl");
  if (input.oauthToken?.trim()) rejectClientMediaOverride("oauthToken");
  if (input.mediaBase64?.trim()) rejectClientMediaOverride("mediaBase64");

  const loadState = loadStateOverride ?? getAgentOsStateForActor;
  const state = await loadState(actor);
  const authz = authorizeCreativePublishFromState(
    state,
    actor.organizationId,
    input.creativeProjectId,
  );

  if (authz.project.status !== "COMPLETED") {
    throw new PersistenceError("validation", "Only COMPLETED creatives may be published", {
      details: [{ field: "status", message: authz.project.status }],
    });
  }

  if (!canPublishCompletedCreative(authz.project)) {
    throw new PersistenceError(
      "validation",
      "Creative does not have a durable primary asset",
      {
        details: [{ field: "productionResult", message: "missing_durable_primary" }],
      },
    );
  }

  const plan = authz.project.productionPlan;
  if (!plan) {
    throw new PersistenceError("validation", "Production plan is required", {
      details: [{ field: "productionPlan", message: "missing" }],
    });
  }

  const target = mapCreativeToSocialPublishTarget({
    platform: plan.platform,
    modality: plan.modality,
  });

  const storedPrimary = await getStoredPrimaryCreativeAsset({
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
  });
  if (!storedPrimary) {
    throw new PersistenceError(
      "validation",
      "Durable primary creative asset is required",
      {
        details: [{ field: "creativeAsset", message: "missing_primary" }],
      },
    );
  }

  if (
    typeof input.assetId === "string" &&
    input.assetId.length > 0 &&
    input.assetId !== storedPrimary.id
  ) {
    throw new PersistenceError("forbidden", "Client assetId does not match store primary", {
      details: [{ field: "assetId", message: "mismatch" }],
    });
  }

  const prior = authz.project.publishResult;
  if (
    authz.job.status === "COMPLETED" &&
    prior?.executionJobId === authz.job.id &&
    prior.published === true
  ) {
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      approvalId: authz.approval.id,
      publishExecutionJobId: authz.job.id,
      publishResult: prior,
      idempotentReplay: true,
    };
  }

  const socialAccount = state.socialAccounts.find(
    (item) =>
      item.organizationId === actor.organizationId &&
      item.platform === target.socialPlatform,
  );
  if (!socialAccount || socialAccount.state !== "CONNECTED") {
    const publishResult: CreativePublishResult = {
      available: false,
      status: "unavailable",
      published: false,
      reason: "social_account_disconnected",
      platform: target.socialPlatform,
      contentType: target.contentType,
      executionJobId: authz.job.id,
    };
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      approvalId: authz.approval.id,
      publishExecutionJobId: authz.job.id,
      publishResult,
      idempotentReplay: false,
    };
  }

  const bytes = await loadCreativeAssetBytes(storedPrimary);
  const adapterResult = await invokeSocialAdapterForCreativePublish({
    project: authz.project,
    target,
    media: {
      mimeType: storedPrimary.mimeType,
      byteSize: storedPrimary.byteSize,
      bytes,
      assetId: storedPrimary.id,
    },
  });

  const publishResult = toPublishResult({
    project: authz.project,
    target,
    executionJobId: authz.job.id,
    adapterResult,
  });

  return {
    ok: true,
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
    approvalId: authz.approval.id,
    publishExecutionJobId: authz.job.id,
    publishResult,
    idempotentReplay: false,
  };
}
