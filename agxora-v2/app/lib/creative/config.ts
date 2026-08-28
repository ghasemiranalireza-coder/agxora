/**
 * Phase 59 / 62 — server-only creative media provider configuration.
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

export type CreativeVideoProviderIdName = "none" | "openai";

export type CreativeVideoConfig = {
  readonly provider: CreativeVideoProviderIdName;
  readonly openaiApiKey: string | null;
  readonly openaiVideoModel: string;
  readonly openaiBaseUrl: string;
};

const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1";

/**
 * Only allow the default OpenAI API host (or identical override).
 * Prevents forwarding AGXORA_OPENAI_API_KEY to an arbitrary base URL.
 */
export function resolveTrustedOpenAIBaseUrl(raw: string | undefined): string {
  const trimmed = (raw?.trim() || DEFAULT_OPENAI_BASE).replace(/\/$/, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return DEFAULT_OPENAI_BASE;
    if (url.hostname !== "api.openai.com") return DEFAULT_OPENAI_BASE;
    const path = url.pathname.replace(/\/$/, "") || "";
    if (path !== "" && path !== "/v1") return DEFAULT_OPENAI_BASE;
    return "https://api.openai.com/v1";
  } catch {
    return DEFAULT_OPENAI_BASE;
  }
}

export function getCreativeVideoProviderId(
  raw: string | undefined = process.env.AGXORA_CREATIVE_VIDEO_PROVIDER,
): CreativeVideoProviderIdName {
  const value = (raw ?? "none").trim().toLowerCase();
  if (value === "openai") return "openai";
  return "none";
}

export function getCreativeImageConfig(): CreativeImageConfig {
  const provider = getCreativeImageProviderId();
  const openaiApiKey = process.env.AGXORA_OPENAI_API_KEY?.trim() || null;
  const openaiImageModel =
    process.env.AGXORA_OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const openaiBaseUrl = resolveTrustedOpenAIBaseUrl(
    process.env.AGXORA_OPENAI_BASE_URL,
  );

  return {
    provider,
    openaiApiKey,
    openaiImageModel,
    openaiBaseUrl,
  };
}

export function getCreativeVideoConfig(): CreativeVideoConfig {
  const provider = getCreativeVideoProviderId();
  const openaiApiKey = process.env.AGXORA_OPENAI_API_KEY?.trim() || null;
  const openaiVideoModel =
    process.env.AGXORA_OPENAI_VIDEO_MODEL?.trim() || "sora-2";
  const openaiBaseUrl = resolveTrustedOpenAIBaseUrl(
    process.env.AGXORA_OPENAI_BASE_URL,
  );

  return {
    provider,
    openaiApiKey,
    openaiVideoModel,
    openaiBaseUrl,
  };
}
