/**
 * Phase 59 / 62 — resolve server-side CreativeGenerationProvider from env.
 */

import "server-only";

import {
  createUnavailableCreativeProvider,
  type CreativeGenerationProvider,
  type CreativeModality,
} from "@/features/agents/creative/provider";
import {
  getCreativeImageConfig,
  getCreativeVideoConfig,
} from "./config";
import { createOpenAICreativeImageProvider } from "./openaiImages";
import { createOpenAICreativeVideoProvider } from "./openaiVideo";

let imageTestOverride: CreativeGenerationProvider | null = null;
let videoTestOverride: CreativeGenerationProvider | null = null;

/** Test-only injection for server image provider resolution. */
export function setServerCreativeImageProviderForTests(
  provider: CreativeGenerationProvider | null,
): void {
  imageTestOverride = provider;
}

/** Test-only injection for server video provider resolution. */
export function setServerCreativeVideoProviderForTests(
  provider: CreativeGenerationProvider | null,
): void {
  videoTestOverride = provider;
}

export function getServerCreativeImageProvider(): CreativeGenerationProvider {
  if (imageTestOverride) return imageTestOverride;

  const config = getCreativeImageConfig();
  if (config.provider === "openai") {
    if (!config.openaiApiKey) {
      return createUnavailableCreativeProvider("openai");
    }
    return createOpenAICreativeImageProvider({
      apiKey: config.openaiApiKey,
      model: config.openaiImageModel,
      baseUrl: config.openaiBaseUrl,
    });
  }

  return createUnavailableCreativeProvider("none");
}

export function getServerCreativeVideoProvider(): CreativeGenerationProvider {
  if (videoTestOverride) return videoTestOverride;

  const config = getCreativeVideoConfig();
  if (config.provider === "openai") {
    if (!config.openaiApiKey) {
      return createUnavailableCreativeProvider("openai_video");
    }
    return createOpenAICreativeVideoProvider({
      apiKey: config.openaiApiKey,
      model: config.openaiVideoModel,
      baseUrl: config.openaiBaseUrl,
    });
  }

  return createUnavailableCreativeProvider("openai_video");
}

export function getServerCreativeMediaProvider(
  modality: CreativeModality,
): CreativeGenerationProvider {
  if (modality === "video") return getServerCreativeVideoProvider();
  return getServerCreativeImageProvider();
}

export function getServerCreativeMediaStatus(): {
  readonly image: {
    readonly id: string;
    readonly configured: boolean;
    readonly modalities: readonly string[];
    readonly providerSetting: string;
  };
  readonly video: {
    readonly id: string;
    readonly configured: boolean;
    readonly modalities: readonly string[];
    readonly providerSetting: string;
  };
} {
  const imageConfig = getCreativeImageConfig();
  const videoConfig = getCreativeVideoConfig();
  const imageProvider = getServerCreativeImageProvider();
  const videoProvider = getServerCreativeVideoProvider();
  return {
    image: {
      id: imageProvider.id,
      configured: imageProvider.configured,
      modalities: imageProvider.modalities,
      providerSetting: imageConfig.provider,
    },
    video: {
      id: videoProvider.id,
      configured: videoProvider.configured,
      modalities: videoProvider.modalities,
      providerSetting: videoConfig.provider,
    },
  };
}

/** @deprecated Use getServerCreativeMediaStatus().image — kept for status route compat. */
export function getServerCreativeImageStatus(): {
  readonly id: string;
  readonly configured: boolean;
  readonly modalities: readonly string[];
  readonly providerSetting: string;
} {
  return getServerCreativeMediaStatus().image;
}
