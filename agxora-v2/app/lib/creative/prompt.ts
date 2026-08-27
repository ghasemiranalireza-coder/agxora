/**
 * Phase 59 — build an image prompt from Creative Producer planning artifacts.
 */

import type { CreativeGenerationRequest } from "@/features/agents/creative/provider";
import type { CreativeBrief } from "@/features/agents/creative/types";

export type CreativeImagePromptInput = CreativeGenerationRequest & {
  readonly brief?: CreativeBrief;
  readonly conceptTitle?: string;
  readonly conceptSummary?: string;
};

export function buildCreativeImagePrompt(
  input: CreativeImagePromptInput,
): string {
  const brief = input.brief;
  const concept = input.conceptTitle
    ? `${input.conceptTitle}: ${input.conceptSummary ?? ""}`.trim()
    : undefined;
  const visual =
    input.storyboard?.frames
      ?.slice(0, 4)
      .map((frame) => frame.visualDirection || frame.description)
      .filter(Boolean)
      .join("; ") || undefined;
  const onScreen =
    input.script?.scenes
      ?.slice(0, 3)
      .map((scene) => scene.onScreenText)
      .filter(Boolean)
      .join(" / ") || undefined;

  const parts = [
    "Create a professional marketing advertisement image.",
    `Platform: ${input.platform}.`,
    `Aspect ratio: ${input.aspectRatio}.`,
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
    brief?.brandNotes ? `Brand notes: ${brief.brandNotes}.` : undefined,
    concept ? `Creative concept: ${concept}.` : undefined,
    visual ? `Visual direction: ${visual}.` : undefined,
    onScreen ? `On-screen text ideas: ${onScreen}.` : undefined,
    `Customer request: ${input.promptSummary}.`,
    "Do not include watermarks. Keep text sparse and legible if any text is shown.",
  ].filter(Boolean);

  return parts.join(" ").slice(0, 3000);
}

/** Map AGXORA aspect ratios to OpenAI GPT Image supported sizes. */
export function mapAspectRatioToOpenAISize(
  aspectRatio: CreativeGenerationRequest["aspectRatio"],
): "1024x1024" | "1024x1536" | "1536x1024" {
  switch (aspectRatio) {
    case "9:16":
    case "4:5":
    case "4:3":
      return "1024x1536";
    case "16:9":
      return "1536x1024";
    case "1:1":
    default:
      return "1024x1024";
  }
}
