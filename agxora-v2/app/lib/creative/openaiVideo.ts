/**
 * Phase 62 — OpenAI video generation provider (server-only).
 *
 * Uses the OpenAI Videos API with synchronous polling inside the request.
 * When unconfigured or unsupported, returns honest unavailable/failed results.
 */

import "server-only";

import type {
  CreativeGenerationProvider,
  CreativeGenerationRequest,
  CreativeGenerationResult,
} from "@/features/agents/creative/provider";
import {
  PAID_VIDEO_GENERATION_TYPES,
  supportsPaidVideoGeneration,
} from "@/features/agents/creative/capabilities";
import {
  buildCreativeVideoPrompt,
  clampVideoDurationSeconds,
  mapAspectRatioToOpenAIVideoSize,
  type CreativeVideoPromptInput,
} from "./videoPrompt";
import { isAllowedCreativeVideoMimeType } from "./assets";
import { getCreativeBlobConfig } from "./blobStore";
import { fetchTrustedProviderVideoAsset } from "./httpsAssetFetch";

export type OpenAIVideoProviderOptions = {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly pollIntervalMs?: number;
  readonly maxPollAttempts?: number;
};

type OpenAIVideoJob = {
  readonly id?: string;
  readonly status?: string;
  readonly error?: { readonly message?: string };
  readonly output?: {
    readonly url?: string;
    readonly video_url?: string;
  };
};

function unavailable(providerId: string, reason: string): CreativeGenerationResult {
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

function isPaidVideoRequest(request: CreativeGenerationRequest): boolean {
  return (
    request.modality === "video" &&
    supportsPaidVideoGeneration(request.creativeType) &&
    (PAID_VIDEO_GENERATION_TYPES as readonly string[]).includes(
      request.creativeType,
    )
  );
}

function tinyMp4DataUrl(label: string): string {
  // Minimal valid-enough mp4 header bytes for tests (ftyp box stub).
  const stub = Buffer.from(`ftyp${label}`.padEnd(32, "0")).toString("base64");
  return `data:video/mp4;base64,${stub}`;
}

export function createOpenAICreativeVideoProvider(
  options: OpenAIVideoProviderOptions,
): CreativeGenerationProvider {
  const providerId = "openai_video";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const maxPollAttempts = options.maxPollAttempts ?? 60;

  return {
    id: providerId,
    modalities: ["video"],
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

      if (!isPaidVideoRequest(request)) {
        return failed(providerId, "phase62_video_types_only");
      }

      if (request.creativeType === "ANIMATION") {
        return failed(providerId, "creative_paid_generation_unsupported");
      }

      const promptInput = request as CreativeVideoPromptInput;
      const prompt = buildCreativeVideoPrompt(promptInput);
      if (!prompt.trim()) {
        return failed(providerId, "empty_video_prompt");
      }

      const size = mapAspectRatioToOpenAIVideoSize(request.aspectRatio);
      const seconds = clampVideoDurationSeconds(request.durationSeconds);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const createResponse = await fetchImpl(`${options.baseUrl}/videos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            prompt,
            size,
            seconds,
          }),
          signal: controller.signal,
        });

        let createPayload: OpenAIVideoJob | null = null;
        try {
          createPayload = (await createResponse.json()) as OpenAIVideoJob;
        } catch {
          createPayload = null;
        }

        if (!createResponse.ok) {
          const raw =
            createPayload?.error?.message ||
            `openai_video_http_${createResponse.status}`;
          return failed(
            providerId,
            sanitizeProviderMessage(raw) || "openai_video_http_failure",
          );
        }

        const jobId = createPayload?.id;
        if (!jobId) {
          return failed(providerId, "openai_video_empty_job");
        }

        let job: OpenAIVideoJob | null = createPayload;
        for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
          if (job?.status === "completed") break;
          if (job?.status === "failed") {
            const raw = job.error?.message || "openai_video_job_failed";
            return failed(providerId, sanitizeProviderMessage(raw));
          }
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          const pollResponse = await fetchImpl(
            `${options.baseUrl}/videos/${encodeURIComponent(jobId)}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${options.apiKey}` },
              signal: controller.signal,
            },
          );
          try {
            job = (await pollResponse.json()) as OpenAIVideoJob;
          } catch {
            return failed(providerId, "openai_video_poll_invalid");
          }
          if (!pollResponse.ok) {
            return failed(providerId, "openai_video_poll_failed");
          }
        }

        if (job?.status !== "completed") {
          return failed(providerId, "openai_video_timeout");
        }

        const remoteUrl =
          job.output?.url?.trim() || job.output?.video_url?.trim() || "";
        let mimeType = "video/mp4";
        let bytes: Uint8Array;
        let assetUrl: string;

        if (remoteUrl.startsWith("https://")) {
          const fetched = await fetchTrustedProviderVideoAsset(remoteUrl);
          mimeType = fetched.mimeType;
          bytes = fetched.bytes;
          assetUrl = tinyMp4DataUrl("provider"); // replaced during persist with durable store
          void assetUrl;
          if (!isAllowedCreativeVideoMimeType(mimeType)) {
            return failed(providerId, "provider_returned_unusable_asset_url");
          }
          const maxBytes = getCreativeBlobConfig().videoMaxBytes;
          if (bytes.byteLength > maxBytes) {
            return failed(providerId, "provider_asset_too_large");
          }
          assetUrl = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
        } else {
          return failed(providerId, "provider_returned_no_assets");
        }

        return {
          available: true,
          generated: true,
          status: "completed",
          reason: "generated",
          providerId,
          assets: [
            {
              providerId,
              providerAssetId: jobId,
              url: assetUrl,
              mimeType,
              durationMs: seconds * 1000,
            },
          ],
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return failed(providerId, "openai_video_timeout");
        }
        return failed(providerId, "openai_video_request_failed");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
