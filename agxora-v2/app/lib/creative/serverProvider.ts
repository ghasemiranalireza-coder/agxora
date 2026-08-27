/**
 * Phase 59 — resolve the server-side CreativeGenerationProvider from env.
 */

import "server-only";

import {
  createUnavailableCreativeProvider,
  type CreativeGenerationProvider,
} from "@/features/agents/creative/provider";
import { getCreativeImageConfig } from "./config";
import { createOpenAICreativeImageProvider } from "./openaiImages";

let testOverride: CreativeGenerationProvider | null = null;

/** Test-only injection for server provider resolution. */
export function setServerCreativeImageProviderForTests(
  provider: CreativeGenerationProvider | null,
): void {
  testOverride = provider;
}

export function getServerCreativeImageProvider(): CreativeGenerationProvider {
  if (testOverride) return testOverride;

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

export function getServerCreativeImageStatus(): {
  readonly id: string;
  readonly configured: boolean;
  readonly modalities: readonly string[];
  readonly providerSetting: string;
} {
  const config = getCreativeImageConfig();
  const provider = getServerCreativeImageProvider();
  return {
    id: provider.id,
    configured: provider.configured,
    modalities: provider.modalities,
    providerSetting: config.provider,
  };
}
