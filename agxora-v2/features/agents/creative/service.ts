/**
 * Phase 58/59 — Creative production orchestration.
 * Reuses Agent OS tools, Operations, and Approvals — no second engine.
 * Phase 59: real image generation runs through a server boundary (secrets stay server-side).
 */

import { auditLog } from "@/app/lib/backend/audit/logger";
import { agentOsService } from "../services/agentOsService";
import { agentsStore } from "../store";
import { operationsService } from "../execution/service";
import { nowIso } from "../growth/ids";
import type { GrowthBusinessProfile } from "../growth/types";
import {
  buildCreativeBrief,
  buildProductionPlan,
  createCreativeProject,
  generateCreativeConcepts,
  generateCreativeScript,
  generateCreativeStoryboard,
} from "./generators";
import {
  getCreativeGenerationProvider,
  type CreativeGenerationResult,
} from "./provider";
import { assertCreativeStatusTransition } from "./transitions";
import {
  canRegenerateCompletedCreative,
  canRequestPaidGeneration,
  hasAgentOsDurablePrimaryAsset,
  shouldPreserveDurableProductionOnRegenerateFailure,
} from "./capabilities";
import type {
  CreativeAssetRef,
  CreativeDraftInput,
  CreativeProject,
  CreativeStatus,
} from "./types";
import {
  hasDurablePrimaryAsset,
  sanitizeAssetsForPersistence,
} from "@/app/lib/creative/assets";

type ServerProviderStatus = {
  readonly id: string;
  readonly configured: boolean;
  readonly modalities: readonly string[];
};

let cachedServerProviderStatus: ServerProviderStatus | null = null;

/** Session-only previews (data URLs). Never written into Agent OS persistence. */
const previewAssetsByCreativeId = new Map<string, readonly CreativeAssetRef[]>();

function orgFilter<T extends { organizationId: string }>(
  items: readonly T[],
  organizationId: string,
): T[] {
  return items.filter((item) => item.organizationId === organizationId);
}

function auditCreative(
  action: string,
  organizationId: string,
  resourceId: string,
  metadata?: Readonly<Record<string, string>>,
): void {
  auditLog({
    action,
    resource: "agent_creative",
    resourceId,
    organizationId,
    metadata,
  });
}

function requireProject(
  organizationId: string,
  creativeId: string,
): CreativeProject {
  const project = orgFilter(
    agentsStore.getSnapshot().creativeProjects,
    organizationId,
  ).find((item) => item.id === creativeId);
  if (!project) throw new Error("Creative project not found");
  return project;
}

function requireProfile(
  organizationId: string,
  profileId?: string,
): GrowthBusinessProfile {
  const profiles = orgFilter(
    agentsStore.getSnapshot().growthProfiles,
    organizationId,
  );
  const profile = profileId
    ? profiles.find((item) => item.id === profileId)
    : profiles[0];
  if (!profile) {
    throw new Error("Growth profile is required before creative production");
  }
  return profile;
}

function setStatus(
  project: CreativeProject,
  status: CreativeStatus,
  patch: Partial<CreativeProject> = {},
): CreativeProject {
  assertCreativeStatusTransition(project.status, status);
  const next: CreativeProject = {
    ...project,
    ...patch,
    status,
    updatedAt: nowIso(),
  };
  agentsStore.upsertCreativeProject(next);
  return next;
}

function applyGenerationResult(
  project: CreativeProject,
  organizationId: string,
  creativeId: string,
  providerId: string,
  providerConfigured: boolean,
  result: CreativeGenerationResult,
  previewAssets?: readonly CreativeAssetRef[],
  options: { readonly jobRegenerate?: boolean } = {},
): CreativeProject {
  const preserveOnFailure = shouldPreserveDurableProductionOnRegenerateFailure(
    project,
    options.jobRegenerate === true,
  );

  if (
    !providerConfigured ||
    !result.available ||
    result.status === "unavailable"
  ) {
    if (preserveOnFailure && project.productionResult) {
      auditCreative(
        "agent.creative.regeneration_unavailable",
        organizationId,
        creativeId,
        { providerId },
      );
      return setStatus(project, "COMPLETED", {
        productionResult: project.productionResult,
      });
    }
    previewAssetsByCreativeId.delete(creativeId);
    const blocked = setStatus(project, "PROVIDER_UNAVAILABLE", {
      productionResult: {
        available: false,
        generated: false,
        status: "unavailable",
        reason: result.reason || "creative_provider_not_configured",
        providerId,
        assets: [],
      },
    });
    auditCreative(
      "agent.creative.provider_unavailable",
      organizationId,
      creativeId,
      { providerId },
    );
    return blocked;
  }

  if (result.status === "failed" || !result.generated) {
    if (preserveOnFailure && project.productionResult) {
      auditCreative("agent.creative.regeneration_failed", organizationId, creativeId, {
        reason: result.reason || "provider_failed",
      });
      return setStatus(project, "COMPLETED", {
        productionResult: project.productionResult,
      });
    }
    previewAssetsByCreativeId.delete(creativeId);
    const failed = setStatus(project, "FAILED", {
      productionResult: {
        available: true,
        generated: false,
        status: "failed",
        reason: result.reason || "provider_failed",
        providerId,
        assets: [],
      },
    });
    auditCreative("agent.creative.generation_failed", organizationId, creativeId);
    return failed;
  }

  const rawAssets = (result.assets ?? []).filter(
    (asset) => typeof asset.url === "string" && asset.url.length > 0,
  );
  // Phase 60: Agent OS persistence uses server durable URLs from result.assets.
  // Never prefer session data URLs for persistence (they would be stripped).
  const persistAssets = sanitizeAssetsForPersistence(rawAssets);
  const hasDurableUrl = persistAssets.some(
    (asset) => typeof asset.url === "string" && asset.url.length > 0,
  );

  // Session preview may include bounded data URLs; durable URL is source of truth.
  if (previewAssets && previewAssets.length > 0) {
    previewAssetsByCreativeId.set(creativeId, previewAssets);
  } else if (
    rawAssets.some(
      (asset) =>
        asset.url?.startsWith("data:image/") ||
        asset.url?.startsWith("data:video/"),
    )
  ) {
    previewAssetsByCreativeId.set(creativeId, rawAssets);
  } else if (hasDurableUrl) {
    previewAssetsByCreativeId.set(creativeId, persistAssets);
  } else {
    previewAssetsByCreativeId.delete(creativeId);
  }

  if (!hasDurableUrl) {
    if (preserveOnFailure && project.productionResult) {
      auditCreative("agent.creative.regeneration_failed", organizationId, creativeId, {
        reason: "creative_asset_not_durable",
      });
      return setStatus(project, "COMPLETED", {
        productionResult: project.productionResult,
      });
    }
    previewAssetsByCreativeId.delete(creativeId);
    const failed = setStatus(project, "FAILED", {
      productionResult: {
        available: true,
        generated: false,
        status: "failed",
        reason:
          rawAssets.length === 0 && !(previewAssets && previewAssets.length > 0)
            ? "provider_returned_no_assets"
            : "creative_asset_not_durable",
        providerId,
        assets: [],
      },
    });
    return failed;
  }

  const completed = setStatus(project, "COMPLETED", {
    productionResult: {
      available: true,
      generated: true,
      status: "completed",
      reason: "generated",
      providerId,
      assets: persistAssets,
    },
  });
  auditCreative("agent.creative.generation_completed", organizationId, creativeId, {
    providerId,
  });
  return completed;
}

export const creativeService = {
  list(organizationId: string): readonly CreativeProject[] {
    return orgFilter(agentsStore.getSnapshot().creativeProjects, organizationId);
  },

  get(organizationId: string, creativeId: string): CreativeProject | undefined {
    return this.list(organizationId).find((item) => item.id === creativeId);
  },

  /** Session-only preview assets (may include bounded data URLs). */
  getPreviewAssets(creativeId: string): readonly CreativeAssetRef[] {
    return previewAssetsByCreativeId.get(creativeId) ?? [];
  },

  clearPreviewAssetsForTests(): void {
    previewAssetsByCreativeId.clear();
  },

  providerStatus() {
    const provider = getCreativeGenerationProvider();
    if (provider.configured && provider.id !== "none") {
      return {
        id: provider.id,
        configured: true,
        modalities: provider.modalities,
      };
    }
    if (cachedServerProviderStatus) {
      return cachedServerProviderStatus;
    }
    return {
      id: provider.id,
      configured: false,
      modalities: provider.modalities,
    };
  },

  /** Refresh provider status from the server boundary (no secrets returned). */
  async refreshProviderStatus(): Promise<ServerProviderStatus> {
    const local = getCreativeGenerationProvider();
    if (local.configured && local.id !== "none") {
      const status = {
        id: local.id,
        configured: true as const,
        modalities: local.modalities,
      };
      cachedServerProviderStatus = status;
      return status;
    }

    try {
      const response = await fetch("/api/v1/agents/creative/status", {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        provider?: {
          id?: string;
          configured?: boolean;
          modalities?: readonly string[];
        };
      };
      if (response.ok && payload.ok && payload.provider) {
        const status: ServerProviderStatus = {
          id: payload.provider.id ?? "none",
          configured: payload.provider.configured === true,
          modalities: payload.provider.modalities ?? ["image"],
        };
        cachedServerProviderStatus = status;
        return status;
      }
    } catch {
      // Fall through to local unavailable status.
    }

    const fallback: ServerProviderStatus = {
      id: local.id,
      configured: false,
      modalities: local.modalities,
    };
    cachedServerProviderStatus = fallback;
    return fallback;
  },

  /** Create brief + concepts (planning only). */
  createBrief(input: CreativeDraftInput): CreativeProject {
    agentOsService.ensureWorkspace(input.organizationId);
    if (!input.customerRequest.trim()) {
      throw new Error("Customer request is required");
    }
    const profile = requireProfile(input.organizationId, input.profileId);
    const brief = buildCreativeBrief(input, profile);
    const concepts = generateCreativeConcepts(
      brief,
      input.creativeType,
      input.platform,
    );
    const project = createCreativeProject({
      organizationId: input.organizationId,
      profileId: profile.id,
      campaignId: input.campaignId,
      customerId: input.customerId,
      creativeType: input.creativeType,
      platform: input.platform,
      brief,
      concepts,
    });
    agentsStore.upsertCreativeProject(project);
    auditCreative("agent.creative.brief_created", input.organizationId, project.id, {
      type: input.creativeType,
      platform: input.platform,
    });
    return project;
  },

  attachScript(
    organizationId: string,
    creativeId: string,
    conceptId?: string,
  ): CreativeProject {
    const project = requireProject(organizationId, creativeId);
    const concept =
      project.concepts.find((item) => item.id === conceptId) ??
      project.concepts[0];
    if (!concept) throw new Error("Creative concept is required");
    const script = generateCreativeScript(project.brief, concept);
    const next: CreativeProject = {
      ...project,
      script,
      updatedAt: nowIso(),
    };
    agentsStore.upsertCreativeProject(next);
    auditCreative("agent.creative.script_created", organizationId, creativeId);
    return next;
  },

  attachStoryboard(organizationId: string, creativeId: string): CreativeProject {
    const project = requireProject(organizationId, creativeId);
    if (!project.script) {
      throw new Error("Script is required before storyboard");
    }
    const storyboard = generateCreativeStoryboard(project.script, project.brief);
    const next: CreativeProject = {
      ...project,
      storyboard,
      updatedAt: nowIso(),
    };
    agentsStore.upsertCreativeProject(next);
    auditCreative("agent.creative.storyboard_created", organizationId, creativeId);
    return next;
  },

  prepareProductionPlan(
    organizationId: string,
    creativeId: string,
  ): CreativeProject {
    let project = requireProject(organizationId, creativeId);
    if (!project.script) {
      project = this.attachScript(organizationId, creativeId);
    }
    if (!project.storyboard) {
      project = this.attachStoryboard(organizationId, creativeId);
    }
    const productionPlan = buildProductionPlan(
      project.creativeType,
      project.platform,
      project.brief,
    );
    const preserveProductionResult = hasAgentOsDurablePrimaryAsset(project);
    const next = setStatus(project, "READY_FOR_APPROVAL", {
      productionPlan,
      approvalState: undefined,
      productionResult: preserveProductionResult
        ? project.productionResult
        : undefined,
    });
    auditCreative(
      "agent.creative.production_plan_ready",
      organizationId,
      creativeId,
    );
    return next;
  },

  /**
   * Queue external generation via Operations.
   * Approval is required by the creative_generate tool definition.
   */
  async requestProduction(organizationId: string, creativeId: string) {
    const project = requireProject(organizationId, creativeId);
    if (!project.productionPlan) {
      throw new Error("Production plan is required before generation");
    }
    if (!canRequestPaidGeneration(project)) {
      throw new Error("creative_paid_generation_unsupported");
    }
    if (
      project.status !== "READY_FOR_APPROVAL" &&
      project.status !== "APPROVED" &&
      project.status !== "PROVIDER_UNAVAILABLE" &&
      project.status !== "FAILED"
    ) {
      throw new Error(
        `Creative must be ready for approval before production (got ${project.status})`,
      );
    }

    const ready =
      project.status === "READY_FOR_APPROVAL"
        ? project
        : setStatus(project, "READY_FOR_APPROVAL", {
            productionResult: undefined,
          });

    const job = operationsService.enqueue({
      organizationId,
      toolId: "creative_generate",
      agentId: "creative_producer",
      title: `Generate creative · ${ready.name}`,
      campaignId: ready.campaignId,
      priority: "HIGH",
      params: {
        creativeId: ready.id,
        growthAction: "creative_generate",
        profileId: ready.profileId,
        customerId: ready.customerId,
      },
    });

    // Stay READY_FOR_APPROVAL until ops clears AgentApproval, then tool runs.
    const next: CreativeProject = {
      ...ready,
      executionJobId: job.id,
      approvalState: "REQUIRES_APPROVAL",
      updatedAt: nowIso(),
    };
    agentsStore.upsertCreativeProject(next);
    auditCreative("agent.creative.production_queued", organizationId, creativeId, {
      jobId: job.id,
    });
    return { project: next, job };
  },

  /**
   * Phase 61 / 62 — explicit regenerate for COMPLETED creatives with durable assets.
   * Re-queues through Operations + fresh AgentApproval (no silent paid regeneration).
   */
  async requestRegenerateProduction(organizationId: string, creativeId: string) {
    const project = requireProject(organizationId, creativeId);
    if (!canRegenerateCompletedCreative(project)) {
      throw new Error("Creative is not eligible for media regeneration");
    }
    if (!project.productionPlan) {
      throw new Error("Production plan is required before regeneration");
    }

    const ready = setStatus(project, "READY_FOR_APPROVAL", {
      productionResult: project.productionResult,
      approvalState: undefined,
    });

    const job = operationsService.enqueue({
      organizationId,
      toolId: "creative_generate",
      agentId: "creative_producer",
      title: `Regenerate creative · ${ready.name}`,
      campaignId: ready.campaignId,
      priority: "HIGH",
      params: {
        creativeId: ready.id,
        growthAction: "creative_generate",
        profileId: ready.profileId,
        customerId: ready.customerId,
        regenerate: true,
      },
    });

    const next: CreativeProject = {
      ...ready,
      executionJobId: job.id,
      approvalState: "REQUIRES_APPROVAL",
      updatedAt: nowIso(),
    };
    agentsStore.upsertCreativeProject(next);
    auditCreative(
      "agent.creative.regeneration_queued",
      organizationId,
      creativeId,
      { jobId: job.id },
    );
    return { project: next, job };
  },

  markApproved(organizationId: string, creativeId: string): CreativeProject {
    const project = requireProject(organizationId, creativeId);
    return setStatus(project, "APPROVED", { approvalState: "APPROVED" });
  },

  markRejected(organizationId: string, creativeId: string): CreativeProject {
    const project = requireProject(organizationId, creativeId);
    return setStatus(project, "BLOCKED", { approvalState: "REJECTED" });
  },

  markRunning(organizationId: string, creativeId: string): CreativeProject {
    const project = requireProject(organizationId, creativeId);
    return setStatus(project, "RUNNING");
  },

  async runProviderGeneration(
    organizationId: string,
    creativeId: string,
  ): Promise<CreativeProject> {
    let project = requireProject(organizationId, creativeId);
    if (
      project.status !== "RUNNING" &&
      project.status !== "QUEUED" &&
      project.status !== "APPROVED"
    ) {
      project = this.markRunning(organizationId, creativeId);
    } else if (project.status !== "RUNNING") {
      project = this.markRunning(organizationId, creativeId);
    }

    const plan = project.productionPlan;
    if (!plan) throw new Error("Production plan missing");

    if (!canRequestPaidGeneration(project)) {
      return applyGenerationResult(
        project,
        organizationId,
        creativeId,
        "none",
        false,
        {
          available: true,
          generated: false,
          status: "failed",
          reason: "creative_paid_generation_unsupported",
          providerId: "none",
          assets: [],
        },
      );
    }

    const generationRequest = {
      organizationId,
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
    };

    const boundJob = project.executionJobId
      ? operationsService.get(organizationId, project.executionJobId)
      : undefined;
    const jobRegenerate = boundJob?.params.regenerate === true;

    // Test / explicit local injection still uses the in-process provider.
    const localProvider = getCreativeGenerationProvider();
    if (localProvider.configured && localProvider.id !== "none") {
      const result = await localProvider.generate(generationRequest);
      return applyGenerationResult(
        project,
        organizationId,
        creativeId,
        localProvider.id,
        localProvider.configured,
        result,
        undefined,
        { jobRegenerate },
      );
    }

    // Phase 59 — real providers run on the server (API keys never enter the browser).
    return this.runServerProviderGeneration(organizationId, creativeId, project);
  },

  async runServerProviderGeneration(
    organizationId: string,
    creativeId: string,
    projectInput?: CreativeProject,
  ): Promise<CreativeProject> {
    const project = projectInput ?? requireProject(organizationId, creativeId);
    const plan = project.productionPlan;
    if (!plan) throw new Error("Production plan missing");

    const boundJob = project.executionJobId
      ? operationsService.get(organizationId, project.executionJobId)
      : undefined;
    const jobRegenerate = boundJob?.params.regenerate === true;

    // Flush Agent OS state so the server can revalidate approvals/projects.
    try {
      await agentsStore.flushPersistence();
    } catch {
      // Continue — server may already have a prior synced snapshot.
    }

    let response: Response;
    try {
      response = await fetch("/api/v1/agents/creative/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeProjectId: project.id,
          organizationId,
          approvalState: project.approvalState,
        }),
      });
    } catch {
      return applyGenerationResult(
        project,
        organizationId,
        creativeId,
        "none",
        false,
        {
          available: false,
          generated: false,
          status: "unavailable",
          reason: "creative_generate_server_unreachable",
          providerId: "none",
          assets: [],
        },
      );
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      code?: string;
      message?: string;
      organizationId?: string;
      providerId?: string;
      result?: CreativeGenerationResult;
      productionResult?: {
        available?: boolean;
        generated?: boolean;
        status?: CreativeGenerationResult["status"];
        reason?: string;
        providerId?: string;
        assets?: readonly CreativeAssetRef[];
      };
      previewAssets?: readonly CreativeAssetRef[];
    };

    if (response.status === 401) {
      throw new Error("Authentication required for creative generation");
    }
    if (response.status === 403) {
      throw new Error(payload.message || "Creative generation forbidden");
    }
    if (response.status === 429) {
      throw new Error(payload.message || "Too many creative generation requests");
    }
    if (!response.ok || !payload.ok || !payload.result) {
      return applyGenerationResult(
        project,
        organizationId,
        creativeId,
        payload.providerId ?? "none",
        false,
        {
          available: false,
          generated: false,
          status: "unavailable",
          reason: payload.message || "creative_generate_server_error",
          providerId: payload.providerId ?? "none",
          assets: [],
        },
      );
    }

    if (
      typeof payload.organizationId === "string" &&
      payload.organizationId !== organizationId
    ) {
      throw new Error("Organization mismatch from creative generation server");
    }

    const result = payload.result;
    const serverProductionResult = payload.productionResult;

    if (
      (result.status === "failed" || !result.generated) &&
      serverProductionResult?.generated === true &&
      hasDurablePrimaryAsset(serverProductionResult.assets)
    ) {
      auditCreative("agent.creative.regeneration_failed", organizationId, creativeId, {
        reason: result.reason || "provider_failed",
      });
      return setStatus(project, "COMPLETED", {
        productionResult: {
          available: serverProductionResult.available ?? true,
          generated: true,
          status: serverProductionResult.status ?? "completed",
          reason: serverProductionResult.reason,
          providerId: serverProductionResult.providerId,
          assets: serverProductionResult.assets,
        },
      });
    }

    return applyGenerationResult(
      project,
      organizationId,
      creativeId,
      result.providerId || payload.providerId || "none",
      result.status === "unavailable" ? false : true,
      result,
      payload.previewAssets,
      { jobRegenerate },
    );
  },
};
