/**
 * Phase 59 — OpenAI Images API creative provider.
 *
 * Uses POST /v1/images/generations with a GPT Image model.
 * GPT Image models return base64 (`b64_json`), not hosted HTTPS URLs.
 * Phase 59 converts successful provider bytes into a usable `data:` URL.
 * Do not fabricate assets when the provider fails or returns empty data.
 */

import type {
  CreativeGenerationProvider,
  CreativeGenerationRequest,
  CreativeGenerationResult,
} from "@/features/agents/creative/provider";
import {
  buildCreativeImagePrompt,
  mapAspectRatioToOpenAISize,
  type CreativeImagePromptInput,
} from "./prompt";

export type OpenAIImagesProviderOptions = {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
};

type OpenAIImageDatum = {
  readonly b64_json?: string;
  readonly url?: string;
  readonly revised_prompt?: string;
};

type OpenAIImagesResponse = {
  readonly data?: readonly OpenAIImageDatum[];
  readonly error?: { readonly message?: string; readonly code?: string };
};

function unavailable(
  providerId: string,
  reason: string,
): CreativeGenerationResult {
  return {
    available: false,
    generated: false,
    status: "unavailable",
    reason,
    providerId,
    assets: [],
  };
}

function failed(providerId: string, reason: string): CreativeGenerationResult {
  return {
    available: true,
    generated: false,
    status: "failed",
    reason,
    providerId,
    assets: [],
  };
}

function sanitizeProviderMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 240);
}

function isUsableAssetUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://")) return true;
  // GPT Image models return b64; Phase 59 embeds real bytes as data URLs.
  if (url.startsWith("data:image/")) return true;
  return false;
}

export function createOpenAICreativeImageProvider(
  options: OpenAIImagesProviderOptions,
): CreativeGenerationProvider {
  const providerId = "openai";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 120_000;

  return {
    id: providerId,
    modalities: ["image"],
    configured: Boolean(options.apiKey),

    async health() {
      if (!options.apiKey) {
        return { ok: false, reason: "openai_api_key_missing" };
      }
      return { ok: true };
    },

    async generate(
      request: CreativeGenerationRequest,
    ): Promise<CreativeGenerationResult> {
      if (!options.apiKey) {
        return unavailable(providerId, "openai_api_key_missing");
      }

      if (request.modality !== "image" || request.creativeType !== "IMAGE_AD") {
        return failed(providerId, "phase59_image_ad_only");
      }

      const promptInput = request as CreativeImagePromptInput;
      const prompt = buildCreativeImagePrompt(promptInput);
      if (!prompt.trim()) {
        return failed(providerId, "empty_image_prompt");
      }

      const size = mapAspectRatioToOpenAISize(request.aspectRatio);
      const outputFormat = "jpeg" as const;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(
          `${options.baseUrl}/images/generations`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: options.model,
              prompt,
              n: 1,
              size,
              quality: "medium",
              output_format: outputFormat,
            }),
            signal: controller.signal,
          },
        );

        let payload: OpenAIImagesResponse | null = null;
        try {
          payload = (await response.json()) as OpenAIImagesResponse;
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const raw =
            payload?.error?.message ||
            `openai_http_${response.status}`;
          return failed(
            providerId,
            sanitizeProviderMessage(raw) || "openai_http_failure",
          );
        }

        const datum = payload?.data?.[0];
        if (!datum) {
          return failed(providerId, "openai_empty_response");
        }

        let assetUrl: string | undefined;
        let mimeType = `image/${outputFormat}`;

        if (typeof datum.url === "string" && datum.url.trim().length > 0) {
          assetUrl = datum.url.trim();
          mimeType = "image/png";
        } else if (
          typeof datum.b64_json === "string" &&
          datum.b64_json.trim().length > 0
        ) {
          // Real provider bytes → usable data URL (not fabricated).
          assetUrl = `data:${mimeType};base64,${datum.b64_json.trim()}`;
        }

        if (!assetUrl || !isUsableAssetUrl(assetUrl)) {
          return failed(providerId, "provider_returned_no_assets");
        }

        const dimensions =
          size === "1024x1536"
            ? { width: 1024, height: 1536 }
            : size === "1536x1024"
              ? { width: 1536, height: 1024 }
              : { width: 1024, height: 1024 };

        return {
          available: true,
          generated: true,
          status: "completed",
          reason: "generated",
          providerId,
          assets: [
            {
              providerId,
              providerAssetId: `openai_${request.creativeProjectId}`,
              url: assetUrl,
              mimeType,
              width: dimensions.width,
              height: dimensions.height,
            },
          ],
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return failed(providerId, "openai_timeout");
        }
        return failed(providerId, "openai_request_failed");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
