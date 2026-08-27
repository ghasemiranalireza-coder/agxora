/**
 * Phase 59 — server-only creative image provider configuration.
 */

import "server-only";

import {
  getCreativeImageProviderId,
  type CreativeImageProviderIdName,
} from "./providerId";

export type CreativeImageConfig = {
  readonly provider: CreativeImageProviderIdName;
  /** Server-only. Never log or return this value. */
  readonly openaiApiKey: string | null;
  readonly openaiImageModel: string;
  readonly openaiBaseUrl: string;
};

export function getCreativeImageConfig(): CreativeImageConfig {
  const provider = getCreativeImageProviderId();
  const openaiApiKey = process.env.AGXORA_OPENAI_API_KEY?.trim() || null;
  const openaiImageModel =
    process.env.AGXORA_OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const openaiBaseUrl = (
    process.env.AGXORA_OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  return {
    provider,
    openaiApiKey,
    openaiImageModel,
    openaiBaseUrl,
  };
}
