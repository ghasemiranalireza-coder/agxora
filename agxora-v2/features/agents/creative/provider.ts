/**
 * Phase 58 — Creative generation provider abstraction.
 * Default is unavailable. Never fabricate media URLs or completed assets.
 */

import type {
  CreativeAspectRatio,
  CreativeAssetRef,
  CreativePlatformId,
  CreativeProductionPlan,
  CreativeScript,
  CreativeStoryboard,
  CreativeType,
} from "./types";

export type CreativeModality = "image" | "video" | "animation";

export type CreativeGenerationRequest = {
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly creativeType: CreativeType;
  readonly platform: CreativePlatformId;
  readonly modality: CreativeModality;
  readonly aspectRatio: CreativeAspectRatio;
  readonly durationSeconds: number;
  readonly script?: CreativeScript;
  readonly storyboard?: CreativeStoryboard;
  readonly productionPlan?: CreativeProductionPlan;
  readonly language: string;
  readonly promptSummary: string;
};

export type CreativeGenerationResult = {
  readonly available: boolean;
  readonly generated: boolean;
  readonly status: "unavailable" | "completed" | "failed";
  readonly reason: string;
  readonly providerId: string;
  readonly assets: readonly CreativeAssetRef[];
};

export interface CreativeGenerationProvider {
  readonly id: string;
  readonly modalities: readonly CreativeModality[];
  readonly configured: boolean;
  health(): Promise<{ readonly ok: boolean; readonly reason?: string }>;
  generate(
    request: CreativeGenerationRequest,
  ): Promise<CreativeGenerationResult>;
}

export function createUnavailableCreativeProvider(
  id = "none",
): CreativeGenerationProvider {
  return {
    id,
    modalities: ["image", "video", "animation"],
    configured: false,
    async health() {
      return { ok: false, reason: "creative_provider_not_configured" };
    },
    async generate() {
      return {
        available: false,
        generated: false,
        status: "unavailable",
        reason: "creative_provider_not_configured",
        providerId: id,
        assets: [],
      };
    },
  };
}

let activeProvider: CreativeGenerationProvider =
  createUnavailableCreativeProvider();

export function getCreativeGenerationProvider(): CreativeGenerationProvider {
  return activeProvider;
}

export function setCreativeGenerationProvider(
  provider: CreativeGenerationProvider,
): void {
  activeProvider = provider;
}

export function resetCreativeGenerationProvider(): void {
  activeProvider = createUnavailableCreativeProvider();
}

/** Test-only: a provider that returns a real-looking success payload. */
export function createTestCreativeProvider(
  overrides: Partial<CreativeGenerationResult> = {},
): CreativeGenerationProvider {
  return {
    id: "test_creative",
    modalities: ["image", "video", "animation"],
    configured: true,
    async health() {
      return { ok: true };
    },
    async generate(request) {
      if (overrides.status === "failed") {
        return {
          available: true,
          generated: false,
          status: "failed",
          reason: overrides.reason ?? "provider_failed",
          providerId: "test_creative",
          assets: [],
        };
      }
      if (overrides.status === "unavailable") {
        return {
          available: false,
          generated: false,
          status: "unavailable",
          reason: overrides.reason ?? "provider_unavailable",
          providerId: "test_creative",
          assets: [],
        };
      }
      return {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "test_creative",
        assets: overrides.assets ?? [
          {
            providerId: "test_creative",
            providerAssetId: `asset_${request.creativeProjectId}`,
            // Local/test injection uses a short HTTPS stub URL (not paid OpenAI).
            // Server Phase 60 path must return data URLs or real bytes to persist.
            url: "https://example.test/generated/creative.bin",
            mimeType:
              request.modality === "image" ? "image/png" : "video/mp4",
            durationMs: request.durationSeconds * 1000,
          },
        ],
      };
    },
  };
}
