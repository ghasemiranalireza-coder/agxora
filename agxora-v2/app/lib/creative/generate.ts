/**
 * Phase 59.1 / Phase 60 — server-side creative image generation service.
 * Actor organization is authoritative. Client approvalState is never authoritative.
 * Phase 60 persists IMAGE_AD bytes into CreativeAssetStore before COMPLETED.
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
import { authorizeCreativeGenerationFromState } from "./authorize";
import {
  hasDurablePrimaryAsset,
  sanitizeAssetsForPersistence,
  validateCreativeAssetUrl,
} from "./assets";
import { persistProviderAssetsDurably } from "./persistAssets";
import { getServerCreativeImageProvider } from "./serverProvider";
import type { CreativeImagePromptInput } from "./prompt";

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
   * Phase 60 — explicit regenerate. Without this flag, COMPLETED creatives that
   * already have a durable primary asset do not call the paid provider again.
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

function alreadyCompletedBlocked(
  providerId: string,
): CreativeGenerationResult {
  return {
    available: true,
    generated: false,
    status: "failed",
    reason: "creative_already_has_durable_asset",
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

  // Client-supplied organizationId is never authoritative.
  if (
    typeof input.organizationId === "string" &&
    input.organizationId.length > 0 &&
    input.organizationId !== actor.organizationId
  ) {
    throw new PersistenceError("forbidden", "Organization mismatch", {
      details: [{ field: "organizationId", message: "actor_org_authoritative" }],
    });
  }

  // Client approvalState is informational only — never authorizes generation.
  void input.approvalState;
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

  // Phase 60 regenerate policy: no silent paid re-generation when durable asset exists.
  const durableExists =
    authz.project.status === "COMPLETED" &&
    authz.project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(authz.project.productionResult.assets);

  if (durableExists && input.regenerate !== true) {
    const blocked = alreadyCompletedBlocked(provider.id);
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      providerId: provider.id,
      approvalId: authz.approval.id,
      executionJobId: authz.job.id,
      result: blocked,
      productionResult: toProductionResult(blocked),
    };
  }

  if (!provider.configured) {
    const result = await provider.generate(request);
    const unavailable: CreativeGenerationResult = {
      available: false,
      generated: false,
      status: "unavailable",
      reason: result.reason || "creative_provider_not_configured",
      providerId: provider.id,
      assets: [],
    };
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      providerId: provider.id,
      approvalId: authz.approval.id,
      executionJobId: authz.job.id,
      result: unavailable,
      productionResult: toProductionResult(unavailable),
    };
  }

  const result = await provider.generate(request);

  if (result.status === "unavailable" || !result.available) {
    const unavailable: CreativeGenerationResult = {
      available: false,
      generated: false,
      status: "unavailable",
      reason: result.reason || "creative_provider_not_configured",
      providerId: provider.id,
      assets: [],
    };
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      providerId: provider.id,
      approvalId: authz.approval.id,
      executionJobId: authz.job.id,
      result: unavailable,
      productionResult: toProductionResult(unavailable),
    };
  }

  if (result.status === "failed" || !result.generated) {
    const failed: CreativeGenerationResult = {
      available: true,
      generated: false,
      status: "failed",
      reason: result.reason || "provider_failed",
      providerId: provider.id,
      assets: [],
    };
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      providerId: provider.id,
      approvalId: authz.approval.id,
      executionJobId: authz.job.id,
      result: failed,
      productionResult: toProductionResult(failed),
    };
  }

  const bounded = boundAssetsOrFail(provider.id, result.assets ?? []);
  if ("status" in bounded) {
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      providerId: provider.id,
      approvalId: authz.approval.id,
      executionJobId: authz.job.id,
      result: bounded,
      productionResult: toProductionResult(bounded),
    };
  }

  const persisted = await persistProviderAssetsDurably({
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
    providerId: provider.id,
    assets: bounded.assets,
    replaceExisting: durableExists && input.regenerate === true,
  });

  if (!persisted.ok) {
    const failed: CreativeGenerationResult = {
      available: true,
      generated: false,
      status: "failed",
      reason: persisted.reason,
      providerId: provider.id,
      assets: [],
    };
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: authz.project.id,
      providerId: provider.id,
      approvalId: authz.approval.id,
      executionJobId: authz.job.id,
      result: failed,
      productionResult: toProductionResult(failed),
    };
  }

  const completed: CreativeGenerationResult = {
    available: true,
    generated: true,
    status: "completed",
    reason: "generated",
    providerId: provider.id,
    assets: persisted.durableAssets,
  };

  return {
    ok: true,
    organizationId: actor.organizationId,
    creativeProjectId: authz.project.id,
    providerId: provider.id,
    approvalId: authz.approval.id,
    executionJobId: authz.job.id,
    result: completed,
    productionResult: toProductionResult(completed),
    previewAssets: persisted.previewAssets,
  };
}
