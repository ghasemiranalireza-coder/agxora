/**
 * Phase 59 — OpenAI Images API creative provider.
 *
 * Uses POST /v1/images/generations with a GPT Image model.
 * GPT Image models return base64 (`b64_json`), not hosted HTTPS URLs.
 * Phase 59 converts successful provider bytes into a usable `data:` URL
 * only when within bounded size limits (Phase 59.1).
 */

import "server-only";

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
import { validateCreativeAssetUrl } from "./assets";

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
  return validateCreativeAssetUrl(url) === null;
}

export interface PreparedImageResult {
  readonly ok: true;
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly model: string;
  readonly providerId: "openai";
  readonly simulated: false;
}

export interface PreparedImageFailure {
  readonly ok: false;
  readonly reason: string;
  readonly providerId: "openai";
  readonly simulated: false;
}

/**
 * Generate one image from a server-built prompt.
 * Returns bytes. Does not persist a data URL or an API key.
 */
export async function generateOpenAIImageFromPrompt(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly prompt: string;
  readonly size: "1024x1024" | "1024x1536" | "1536x1024";
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}): Promise<PreparedImageResult | PreparedImageFailure> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 120_000);
  try {
    const response = await fetchImpl(`${input.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        n: 1,
        size: input.size,
        quality: "medium",
        output_format: "jpeg",
      }),
      signal: controller.signal,
    });
    let payload: OpenAIImagesResponse | null = null;
    try {
      payload = (await response.json()) as OpenAIImagesResponse;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const raw = payload?.error?.message || `openai_http_${response.status}`;
      return { ok: false, providerId: "openai", simulated: false, reason: sanitizeProviderMessage(raw) || "openai_http_failure" };
    }
    const encoded = payload?.data?.[0]?.b64_json?.trim() ?? "";
    if (!encoded) {
      return { ok: false, providerId: "openai", simulated: false, reason: "provider_returned_no_assets" };
    }
    const bytes = Uint8Array.from(Buffer.from(encoded, "base64"));
    if (bytes.byteLength === 0) {
      return { ok: false, providerId: "openai", simulated: false, reason: "provider_returned_no_assets" };
    }
    const dimensions =
      input.size === "1024x1536"
        ? { width: 1024, height: 1536 }
        : input.size === "1536x1024"
          ? { width: 1536, height: 1024 }
          : { width: 1024, height: 1024 };
    return {
      ok: true,
      bytes,
      mimeType: "image/jpeg",
      width: dimensions.width,
      height: dimensions.height,
      model: input.model,
      providerId: "openai",
      simulated: false,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, providerId: "openai", simulated: false, reason: "openai_timeout" };
    }
    return { ok: false, providerId: "openai", simulated: false, reason: "openai_request_failed" };
  } finally {
    clearTimeout(timer);
  }
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
          const reason = assetUrl
            ? validateCreativeAssetUrl(assetUrl) ?? "provider_returned_no_assets"
            : "provider_returned_no_assets";
          return failed(providerId, reason);
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
