/**
 * Phase 61 — Creative paid-generation capability gates.
 * Planning remains available for all types; paid provider calls are IMAGE_AD only.
 */

import { hasDurablePrimaryAsset } from "@/app/lib/creative/assets";
import type { CreativeProject, CreativeType } from "./types";

/** Creative types that may reach the paid image provider (Phase 59/61). */
export const PAID_IMAGE_GENERATION_TYPES = ["IMAGE_AD"] as const;

export type PaidImageGenerationType =
  (typeof PAID_IMAGE_GENERATION_TYPES)[number];

export function supportsPaidImageGeneration(
  creativeType: CreativeType,
): creativeType is PaidImageGenerationType {
  return creativeType === "IMAGE_AD";
}

/** True when external paid generation is supported for this creative. */
export function canRequestPaidGeneration(
  project: Pick<CreativeProject, "creativeType" | "productionPlan">,
): boolean {
  if (!supportsPaidImageGeneration(project.creativeType)) return false;
  return project.productionPlan?.modality === "image";
}

/** COMPLETED IMAGE_AD with a durable primary asset — eligible for explicit regenerate. */
export function canRegenerateCompletedImage(project: CreativeProject): boolean {
  return (
    project.status === "COMPLETED" &&
    project.creativeType === "IMAGE_AD" &&
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}

/** Preserve Agent OS productionResult when a paid regenerate attempt fails. */
export function shouldPreserveDurableProductionOnRegenerateFailure(
  project: Pick<CreativeProject, "productionResult">,
  regenerate: boolean,
): boolean {
  return (
    regenerate === true &&
    project.productionResult?.generated === true &&
    hasDurablePrimaryAsset(project.productionResult.assets)
  );
}
