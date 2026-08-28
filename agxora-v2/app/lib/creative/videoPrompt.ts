/**
 * Phase 62 — build a video prompt from Creative Producer planning artifacts.
 */

import type { CreativeGenerationRequest } from "@/features/agents/creative/provider";
import type { CreativeBrief } from "@/features/agents/creative/types";

export type CreativeVideoPromptInput = CreativeGenerationRequest & {
  readonly brief?: CreativeBrief;
  readonly conceptTitle?: string;
  readonly conceptSummary?: string;
};

export function buildCreativeVideoPrompt(
  input: CreativeVideoPromptInput,
): string {
  const brief = input.brief;
  const scenes =
    input.script?.scenes
      ?.slice(0, 6)
      .map(
        (scene) =>
          `${scene.title}: ${scene.visualDirection || scene.narration}`.trim(),
      )
      .filter(Boolean)
      .join(" | ") || undefined;
  const frames =
    input.storyboard?.frames
      ?.slice(0, 6)
      .map((frame) => frame.visualDirection || frame.description)
      .filter(Boolean)
      .join(" | ") || undefined;

  const parts = [
    "Create a professional short-form marketing video advertisement.",
    `Platform: ${input.platform}.`,
    `Aspect ratio: ${input.aspectRatio}.`,
    `Target duration: ${input.durationSeconds} seconds.`,
    `Language/context: ${input.language}.`,
    brief?.productOrService
      ? `Product/service: ${brief.productOrService}.`
      : undefined,
    brief?.targetAudience
      ? `Target audience: ${brief.targetAudience}.`
      : undefined,
    brief?.campaignGoal ? `Campaign goal: ${brief.campaignGoal}.` : undefined,
    brief?.tone ? `Tone: ${brief.tone}.` : undefined,
    brief?.cta ? `Call to action: ${brief.cta}.` : undefined,
    scenes ? `Script scenes: ${scenes}.` : undefined,
    frames ? `Storyboard: ${frames}.` : undefined,
    `Customer request: ${input.promptSummary}.`,
    "No watermarks. Legible on-screen text only when essential.",
  ].filter(Boolean);

  return parts.join(" ").slice(0, 4000);
}

/** Map AGXORA aspect ratios to OpenAI video size strings. */
export function mapAspectRatioToOpenAIVideoSize(
  aspectRatio: CreativeGenerationRequest["aspectRatio"],
): "720x1280" | "1280x720" | "1024x1024" {
  switch (aspectRatio) {
    case "9:16":
    case "4:5":
      return "720x1280";
    case "16:9":
      return "1280x720";
    case "1:1":
    case "4:3":
    default:
      return "1024x1024";
  }
}

export function clampVideoDurationSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 5;
  return Math.min(Math.max(Math.round(seconds), 3), 20);
}
