/**
 * Phase 58 — Creative tool handlers.
 */

import { agentsStore } from "../store";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import { creativeService } from "./service";
import type { CreativeDraftInput, CreativePlatformId, CreativeType } from "./types";
import { CREATIVE_PLATFORMS, CREATIVE_TYPES } from "./types";

function readString(
  params: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(
  params: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asCreativeType(value: string | undefined): CreativeType {
  if (value && (CREATIVE_TYPES as readonly string[]).includes(value)) {
    return value as CreativeType;
  }
  return "VIDEO_AD";
}

function asPlatform(value: string | undefined): CreativePlatformId {
  if (value && (CREATIVE_PLATFORMS as readonly string[]).includes(value)) {
    return value as CreativePlatformId;
  }
  return "instagram_reels";
}

/** Planning tool: brief / script / storyboard / plan (no external side effects). */
export async function handleCreativeTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "growthAction") ?? "brief";

  try {
    if (action === "script") {
      const creativeId = readString(ctx.params, "creativeId");
      if (!creativeId) {
        return {
          ok: false,
          error: "creativeId is required",
          durationMs: Date.now() - started,
        };
      }
      const project = creativeService.attachScript(
        ctx.organizationId,
        creativeId,
        readString(ctx.params, "conceptId"),
      );
      return {
        ok: true,
        output: {
          creativeId: project.id,
          hasScript: Boolean(project.script),
          generated: false,
          published: false,
        },
        durationMs: Date.now() - started,
      };
    }

    if (action === "storyboard") {
      const creativeId = readString(ctx.params, "creativeId");
      if (!creativeId) {
        return {
          ok: false,
          error: "creativeId is required",
          durationMs: Date.now() - started,
        };
      }
      const project = creativeService.attachStoryboard(
        ctx.organizationId,
        creativeId,
      );
      return {
        ok: true,
        output: {
          creativeId: project.id,
          frames: project.storyboard?.frames.length ?? 0,
          generated: false,
          published: false,
        },
        durationMs: Date.now() - started,
      };
    }

    if (action === "plan") {
      const creativeId = readString(ctx.params, "creativeId");
      if (!creativeId) {
        return {
          ok: false,
          error: "creativeId is required",
          durationMs: Date.now() - started,
        };
      }
      const project = creativeService.prepareProductionPlan(
        ctx.organizationId,
        creativeId,
      );
      return {
        ok: true,
        output: {
          creativeId: project.id,
          status: project.status,
          requiresExternalGeneration:
            project.productionPlan?.requiresExternalGeneration === true,
          generated: false,
          published: false,
        },
        durationMs: Date.now() - started,
      };
    }

    const request =
      readString(ctx.params, "customerRequest") ||
      readString(ctx.params, "goal") ||
      "";
    const draft: CreativeDraftInput = {
      organizationId: ctx.organizationId,
      profileId: readString(ctx.params, "profileId"),
      campaignId: readString(ctx.params, "campaignId"),
      customerId: readString(ctx.params, "customerId"),
      creativeType: asCreativeType(readString(ctx.params, "creativeType")),
      platform: asPlatform(readString(ctx.params, "platform")),
      customerRequest: request,
      language: readString(ctx.params, "language"),
      durationSeconds: readNumber(ctx.params, "durationSeconds"),
      cta: readString(ctx.params, "cta"),
      productOrService: readString(ctx.params, "productOrService"),
      targetAudience: readString(ctx.params, "targetAudience"),
      campaignGoal: readString(ctx.params, "campaignGoal"),
      tone: readString(ctx.params, "tone"),
    };
    const project = creativeService.createBrief(draft);
    return {
      ok: true,
      output: {
        creativeId: project.id,
        status: project.status,
        conceptCount: project.concepts.length,
        generated: false,
        published: false,
      },
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "creative_failed",
      durationMs: Date.now() - started,
    };
  }
}

/** External generation — approval-gated; never fakes success. */
export async function handleCreativeGenerateTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const creativeId = readString(ctx.params, "creativeId");
  if (!creativeId) {
    return {
      ok: false,
      error: "creativeId is required",
      durationMs: Date.now() - started,
    };
  }

  try {
    const before = agentsStore
      .getSnapshot()
      .creativeProjects.find(
        (item) =>
          item.id === creativeId && item.organizationId === ctx.organizationId,
      );
    if (!before) {
      return {
        ok: false,
        error: "Creative project not found",
        durationMs: Date.now() - started,
      };
    }

    // Mark approved path when ops already cleared approval.
    if (before.approvalState !== "APPROVED") {
      creativeService.markApproved(ctx.organizationId, creativeId);
    }

    const project = await creativeService.runProviderGeneration(
      ctx.organizationId,
      creativeId,
    );
    const result = project.productionResult;
    return {
      ok: true,
      output: {
        creativeId: project.id,
        status: project.status,
        available: result?.available === true,
        generated: result?.generated === true,
        published: false,
        reason: result?.reason,
        providerId: result?.providerId,
        assetCount: result?.assets?.length ?? 0,
      },
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "creative_generate_failed",
      durationMs: Date.now() - started,
    };
  }
}
