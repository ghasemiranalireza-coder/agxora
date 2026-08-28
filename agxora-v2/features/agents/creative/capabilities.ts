/**
 * Phase 61 / 62 — Creative paid-generation capability gates.
 * Phase 61.1: regenerate authorization follows ExecutionJob.params.regenerate (server).
 */

import { hasDurablePrimaryAsset } from "@/app/lib/creative/assets";
import type { CreativeProject, CreativeType } from "./types";

/** Creative types that may reach the paid image provider (Phase 59/61). */
export const PAID_IMAGE_GENERATION_TYPES = ["IMAGE_AD"] as const;

/** Creative types that may reach the paid video provider (Phase 62). */
export const PAID_VIDEO_GENERATION_TYPES = ["VIDEO_AD", "SOCIAL_VIDEO"] as const;

export type PaidImageGenerationType =
  (typeof PAID_IMAGE_GENERATION_TYPES)[number];

export type PaidVideoGenerationType =
  (typeof PAID_VIDEO_GENERATION_TYPES)[number];

export function supportsPaidImageGeneration(
  creativeType: CreativeType,
): creativeType is PaidImageGenerationType {
  return creativeType === "IMAGE_AD";
}

export function supportsPaidVideoGeneration(
  creativeType: CreativeType,
): creativeType is PaidVideoGenerationType {
  return (
    creativeType === "VIDEO_AD" || creativeType === "SOCIAL_VIDEO"
  );
}

/** True when external paid generation is supported for this creative. */
export function canRequestPaidGeneration(
  project: Pick<CreativeProject, "creativeType" | "productionPlan">,
): boolean {
  const modality = project.productionPlan?.modality;
  if (modality === "image") {
    return supportsPaidImageGeneration(project.creativeType);
  }
  if (modality === "video") {
    return supportsPaidVideoGeneration(project.creativeType);
  }
  // ANIMATION and other modalities remain blocked in Phase 62.
  return false;
}

/** COMPLETED IMAGE_AD with a durable primary asset — eligible for explicit regenerate. */
export function canRegenerateCompletedImage(project: CreativeProject): boolean {
  return (
    project.status === "COMPLETED" &&
    project.creativeType === "IMAGE_AD" &&
    project.productionPlan?.modality === "image" &&
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}

/** COMPLETED VIDEO_AD / SOCIAL_VIDEO with durable primary — eligible for regenerate. */
export function canRegenerateCompletedVideo(project: CreativeProject): boolean {
  return (
    project.status === "COMPLETED" &&
    supportsPaidVideoGeneration(project.creativeType) &&
    project.productionPlan?.modality === "video" &&
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}

/** COMPLETED creative with durable primary asset — image or video regenerate. */
export function canRegenerateCompletedCreative(
  project: CreativeProject,
): boolean {
  return (
    canRegenerateCompletedImage(project) ||
    canRegenerateCompletedVideo(project)
  );
}

/** Agent OS durable URL present (store may also hold bytes — checked server-side). */
export function hasAgentOsDurablePrimaryAsset(
  project: Pick<CreativeProject, "productionResult">,
): boolean {
  return (
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}

/** Preserve productionResult when an authorized regenerate attempt fails (client hint). */
export function shouldPreserveDurableProductionOnRegenerateFailure(
  project: Pick<CreativeProject, "productionResult">,
  jobRegenerate: boolean,
): boolean {
  return jobRegenerate === true && hasAgentOsDurablePrimaryAsset(project);
}

/** COMPLETED creative with durable primary asset — eligible for explicit publish. */
export function canPublishCompletedCreative(project: CreativeProject): boolean {
  return (
    project.status === "COMPLETED" &&
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}

/** UI/service gate for queueing creative_publish. */
export function canRequestPublish(
  project: Pick<CreativeProject, "status" | "productionResult">,
): boolean {
  return (
    project.status === "COMPLETED" &&
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}
