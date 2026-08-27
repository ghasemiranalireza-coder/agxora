/**
 * Phase 59 — server-side creative image generation service.
 * Actor organization is authoritative. Never trust client organizationId.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type {
  CreativeGenerationRequest,
  CreativeGenerationResult,
} from "@/features/agents/creative/provider";
import type {
  CreativeBrief,
  CreativeProductionResult,
} from "@/features/agents/creative/types";
import { getServerCreativeImageProvider } from "./serverProvider";
import type { CreativeImagePromptInput } from "./prompt";

export type ServerCreativeGenerateInput = {
  readonly creativeProjectId: string;
  /** Ignored for authority — actor.organizationId wins. */
  readonly organizationId?: string;
  readonly approvalState?: string;
  readonly request: CreativeGenerationRequest;
  readonly brief?: CreativeBrief;
  readonly conceptTitle?: string;
  readonly conceptSummary?: string;
};

export type ServerCreativeGenerateSuccess = {
  readonly ok: true;
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly providerId: string;
  readonly result: CreativeGenerationResult;
  readonly productionResult: CreativeProductionResult;
};

function toProductionResult(
  result: CreativeGenerationResult,
): CreativeProductionResult {
  return {
    available: result.available,
    generated: result.generated,
    status: result.status,
    reason: result.reason,
    providerId: result.providerId,
    assets: result.assets,
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

  if (input.approvalState !== "APPROVED") {
    throw new PersistenceError(
      "forbidden",
      "Creative generation requires an approved AgentApproval",
      {
        details: [{ field: "approvalState", message: "must_be_APPROVED" }],
      },
    );
  }

  // Client-supplied organizationId is never authoritative.
  if (
    typeof input.organizationId === "string" &&
    input.organizationId.length > 0 &&
    input.organizationId !== actor.organizationId
  ) {
    throw new PersistenceError(
      "forbidden",
      "Organization mismatch",
      {
        details: [{ field: "organizationId", message: "actor_org_authoritative" }],
      },
    );
  }

  if (!input.request || typeof input.request !== "object") {
    throw new PersistenceError("validation", "generation request is required");
  }

  if (input.request.creativeProjectId !== input.creativeProjectId) {
    throw new PersistenceError(
      "validation",
      "creativeProjectId does not match generation request",
    );
  }

  const provider = getServerCreativeImageProvider();

  const request: CreativeImagePromptInput = {
    ...input.request,
    organizationId: actor.organizationId,
    creativeProjectId: input.creativeProjectId,
    brief: input.brief,
    conceptTitle: input.conceptTitle,
    conceptSummary: input.conceptSummary,
  };

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
      creativeProjectId: input.creativeProjectId,
      providerId: provider.id,
      result: unavailable,
      productionResult: toProductionResult(unavailable),
    };
  }

  const result = await provider.generate(request);

  // Hard honesty: never accept generated=true without usable asset URLs.
  if (result.status === "completed" || result.generated) {
    const assets = (result.assets ?? []).filter(
      (asset) => typeof asset.url === "string" && asset.url.length > 0,
    );
    if (!result.generated || assets.length === 0) {
      const failed: CreativeGenerationResult = {
        available: true,
        generated: false,
        status: "failed",
        reason: "provider_returned_no_assets",
        providerId: provider.id,
        assets: [],
      };
      return {
        ok: true,
        organizationId: actor.organizationId,
        creativeProjectId: input.creativeProjectId,
        providerId: provider.id,
        result: failed,
        productionResult: toProductionResult(failed),
      };
    }
    const completed: CreativeGenerationResult = {
      ...result,
      available: true,
      generated: true,
      status: "completed",
      assets,
    };
    return {
      ok: true,
      organizationId: actor.organizationId,
      creativeProjectId: input.creativeProjectId,
      providerId: provider.id,
      result: completed,
      productionResult: toProductionResult(completed),
    };
  }

  return {
    ok: true,
    organizationId: actor.organizationId,
    creativeProjectId: input.creativeProjectId,
    providerId: provider.id,
    result,
    productionResult: toProductionResult(result),
  };
}
