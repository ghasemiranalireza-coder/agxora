/**
 * Phase 59.1 / Phase 60 / 61.1 — server-side creative image generation service.
 * Actor organization is authoritative. Client approvalState/regenerate never authorize.
 * Phase 61.1: CreativeAssetStore primary + job.params.regenerate are authoritative.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type {
  CreativeGenerationRequest,
  CreativeGenerationResult,
} from "@/features/agents/creative/provider";
import type {
  CreativeAssetRef,
  CreativeProductionResult,
  CreativeProject,
} from "@/features/agents/creative/types";
import type { CreativeAssetRecord } from "./assetStore";
import { authorizeCreativeGenerationFromState } from "./authorize";
import { canRequestPaidGeneration } from "@/features/agents/creative/capabilities";
import {
  hasDurablePrimaryAsset,
  sanitizeAssetsForPersistence,
  validateCreativeAssetUrl,
} from "./assets";
import { persistProviderAssetsDurably } from "./persistAssets";
import { getServerCreativeImageProvider } from "./serverProvider";
import type { CreativeImagePromptInput } from "./prompt";
import {
  buildProductionResultFromStoredPrimary,
  getStoredPrimaryCreativeAsset,
  isRegenerateExecutionJob,
} from "./storedPrimaryAsset";

export type ServerCreativeGenerateInput = {
  readonly creativeProjectId: string;
  /** Ignored for authority — actor.organizationId wins. */
  readonly organizationId?: string;
  /**
   * Informational only. MUST NOT authorize generation.
   * Real AgentApproval is loaded from Agent OS state.
   */
  readonly approvalState?: string;
  /** Ignored for authority — server builds request from persisted project. */
  readonly request?: CreativeGenerationRequest;
  readonly brief?: unknown;
  readonly conceptTitle?: unknown;
  readonly conceptSummary?: unknown;
  /**
   * Informational only — MUST NOT authorize regenerate (Phase 61.1).
   * Authoritative flag: bound ExecutionJob.params.regenerate === true.
   */
  readonly regenerate?: boolean;
};

export type ServerCreativeGenerateSuccess = {
  readonly ok: true;
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly providerId: string;
  readonly approvalId: string;
  readonly executionJobId: string;
  readonly result: CreativeGenerationResult;
  /** Safe for Agent OS persistence (data URLs stripped; durable URLs kept). */
  readonly productionResult: CreativeProductionResult;
  /**
   * Optional preview assets including bounded data URLs for immediate UI.
   * Not intended for Agent OS persistence.
   */
  readonly previewAssets?: readonly CreativeAssetRef[];
};

type LoadStateFn = (actor: Actor) => Promise<AgentsPersistedState>;

let loadStateOverride: LoadStateFn | null = null;

/** Test-only state loader injection (avoids Prisma in unit tests). */
export function setCreativeGenerateLoadStateForTests(
  loader: LoadStateFn | null,
): void {
  loadStateOverride = loader;
}

function toProductionResult(
  result: CreativeGenerationResult,
): CreativeProductionResult {
  return {
    available: result.available,
    generated: result.generated,
    status: result.status,
    reason: result.reason,
    providerId: result.providerId,
    assets: sanitizeAssetsForPersistence(result.assets ?? []),
  };
}

function productionResultForOutcome(
  project: CreativeProject,
  result: CreativeGenerationResult,
  jobRegenerate: boolean,
  storedPrimary: CreativeAssetRecord | null,
): CreativeProductionResult {
  const hasStoredDurable = storedPrimary !== null;
  const hasOsDurable =
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets);

  if (
    jobRegenerate &&
    (hasStoredDurable || hasOsDurable) &&
    (result.status === "failed" ||
      !result.generated ||
      result.status === "unavailable")
  ) {
    if (hasOsDurable && project.productionResult) {
      return project.productionResult;
    }
    if (storedPrimary) {
      return buildProductionResultFromStoredPrimary(storedPrimary);
    }
  }

  return toProductionResult(result);
}

function buildTrustedRequest(
  actorOrganizationId: string,
  project: CreativeProject,
): CreativeImagePromptInput {
  const plan = project.productionPlan;
  if (!plan) {
    throw new PersistenceError(
      "validation",
      "Creative production plan is required",
      { details: [{ field: "productionPlan", message: "missing" }] },
    );
  }
  const concept = project.concepts[0];
  return {
    organizationId: actorOrganizationId,
    creativeProjectId: project.id,
    creativeType: project.creativeType,
    platform: project.platform,
    modality: plan.modality,
    aspectRatio: plan.aspectRatio,
    durationSeconds: plan.estimatedDurationSeconds,
    script: project.script,
    storyboard: project.storyboard,
    productionPlan: plan,
    language: project.brief.language,
    promptSummary: project.brief.customerRequest,
    brief: project.brief,
    conceptTitle: concept?.title,
    conceptSummary: concept?.summary,
  };
}

function boundAssetsOrFail(
  providerId: string,
  assets: readonly CreativeAssetRef[],
): CreativeGenerationResult | { readonly assets: readonly CreativeAssetRef[] } {
  const usable: CreativeAssetRef[] = [];
  for (const asset of assets) {
    if (typeof asset.url !== "string" || asset.url.length === 0) continue;
    const reason = validateCreativeAssetUrl(asset.url);
    if (reason === "provider_asset_too_large") {
      return {
        available: true,
        generated: false,
        status: "failed",
        reason: "provider_asset_too_large",
        providerId,
        assets: [],
      };
    }
    if (reason) continue;
    usable.push(asset);
  }
  if (usable.length === 0) {
    return {
      available: true,
      generated: false,
      status: "failed",
      reason: "provider_returned_no_assets",
      providerId,
      assets: [],
    };
  }
  return { assets: usable };
}

function regenerateJobRequired(
  providerId: string,
): CreativeGenerationResult {
  return {
    available: true,
    generated: false,
    status: "failed",
    reason: "creative_regenerate_job_required",
    providerId,
    assets: [],
  };
}

/**
 * Run image generation for an approved creative.
 * Secrets never leave this server path.
 */
export async function generateCreativeImageForActor(
  actor: Actor,
  input: ServerCreativeGenerateInput,
): Promise<ServerCreativeGenerateSuccess> {
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

  // Client fields are informational only — never authorize generation/regenerate.
  void input.approvalState;
  void input.regenerate;
  void input.request;
  void input.brief;
  void input.conceptTitle;
  void input.conceptSummary;

  const loadState = loadStateOverride ?? getAgentOsStateForActor;
  const state = await loadState(actor);
  const authz = authorizeCreativeGenerationFromState(
    state,
    actor.organizationId,
    input.creativeProjectId,
  );

  const provider = getServerCreativeImageProvider();
  const request = buildTrustedRequest(actor.organizationId, authz.project);
  const jobRegenerate = isRegenerateExecutionJob(authz.job.params);

  const storedPrimary = await getStoredPrimaryCreativeAsset({
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
  });
  const hasExistingDurable = storedPrimary !== null;

  const respond = (
    result: CreativeGenerationResult,
    previewAssets?: readonly CreativeAssetRef[],
  ): ServerCreativeGenerateSuccess => ({
    ok: true,
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
    providerId: provider.id,
    approvalId: authz.approval.id,
    executionJobId: authz.job.id,
    result,
    productionResult: productionResultForOutcome(
      authz.project,
      result,
      jobRegenerate,
      storedPrimary,
    ),
    previewAssets,
  });

  if (!canRequestPaidGeneration(authz.project)) {
    return respond({
      available: true,
      generated: false,
      status: "failed",
      reason: "creative_paid_generation_unsupported",
      providerId: provider.id,
      assets: [],
    });
  }

  // Phase 61.1: store-primary is authoritative; job.params.regenerate authorizes replacement.
  if (hasExistingDurable && !jobRegenerate) {
    return respond(regenerateJobRequired(provider.id));
  }

  if (!provider.configured) {
    const result = await provider.generate(request);
    return respond({
      available: false,
      generated: false,
      status: "unavailable",
      reason: result.reason || "creative_provider_not_configured",
      providerId: provider.id,
      assets: [],
    });
  }

  const result = await provider.generate(request);

  if (result.status === "unavailable" || !result.available) {
    return respond({
      available: false,
      generated: false,
      status: "unavailable",
      reason: result.reason || "creative_provider_not_configured",
      providerId: provider.id,
      assets: [],
    });
  }

  if (result.status === "failed" || !result.generated) {
    return respond({
      available: true,
      generated: false,
      status: "failed",
      reason: result.reason || "provider_failed",
      providerId: provider.id,
      assets: [],
    });
  }

  const bounded = boundAssetsOrFail(provider.id, result.assets ?? []);
  if ("status" in bounded) {
    return respond(bounded);
  }

  const persisted = await persistProviderAssetsDurably({
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
    providerId: provider.id,
    assets: bounded.assets,
    replaceExisting: hasExistingDurable && jobRegenerate,
  });

  if (!persisted.ok) {
    return respond({
      available: true,
      generated: false,
      status: "failed",
      reason: persisted.reason,
      providerId: provider.id,
      assets: [],
    });
  }

  return respond(
    {
      available: true,
      generated: true,
      status: "completed",
      reason: "generated",
      providerId: provider.id,
      assets: persisted.durableAssets,
    },
    persisted.previewAssets,
  );
}
