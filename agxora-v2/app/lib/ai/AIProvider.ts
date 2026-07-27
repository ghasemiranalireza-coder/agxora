/**
 * Provider-independent AI interface.
 * OpenAI / Anthropic / Gemini / OpenRouter / Ollama all implement this.
 */

import type { AIRuntimeContext } from "./AIContext";
import type { AIModelDefinition, AIProviderId } from "./AIModel";
import type { AISettings } from "./AISettings";
import type { AIStreamHandler } from "./AIStreaming";
import type { AIToolCall, AIToolDefinition } from "./AITools";

export interface AIChatRequest {
  readonly context: AIRuntimeContext;
  readonly modelId: string;
  readonly settings: AISettings;
  readonly tools?: readonly AIToolDefinition[];
  readonly signal?: AbortSignal;
}

export interface AIChatResponse {
  readonly content: string;
  readonly providerId: AIProviderId;
  readonly modelId: string;
  readonly toolCalls?: readonly AIToolCall[];
  readonly usage?: {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
    readonly totalTokens?: number;
  };
  readonly finishReason?: "stop" | "length" | "tool_calls" | "cancelled" | "error";
}

export interface AIEmbeddingRequest {
  readonly input: string | readonly string[];
  readonly modelId?: string;
  readonly signal?: AbortSignal;
}

export interface AIEmbeddingResponse {
  readonly vectors: readonly (readonly number[])[];
  readonly modelId: string;
  readonly providerId: AIProviderId;
}

export interface AIHealthStatus {
  readonly ok: boolean;
  readonly providerId: AIProviderId;
  readonly configured: boolean;
  readonly message: string;
  readonly checkedAt: string;
}

export interface AIVisionRequest {
  readonly prompt: string;
  readonly imageUrls?: readonly string[];
  readonly imageBase64?: readonly string[];
  readonly modelId?: string;
  readonly signal?: AbortSignal;
}

export interface AIAudioTranscribeRequest {
  readonly audioBase64?: string;
  readonly mimeType?: string;
  readonly signal?: AbortSignal;
}

export interface AIAudioSpeakRequest {
  readonly text: string;
  readonly voiceId?: string;
  readonly signal?: AbortSignal;
}

/**
 * Canonical provider contract — add providers without changing callers.
 */
export interface AIProvider {
  readonly id: AIProviderId;
  readonly displayName: string;

  chat(request: AIChatRequest): Promise<AIChatResponse>;
  stream(request: AIChatRequest, onEvent: AIStreamHandler): Promise<AIChatResponse>;
  embeddings(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse>;
  models(): Promise<readonly AIModelDefinition[]>;
  health(): Promise<AIHealthStatus>;
  toolCalling(request: AIChatRequest): Promise<AIChatResponse>;
  vision(request: AIVisionRequest): Promise<AIChatResponse>;

  /** Future audio — architecture only. */
  transcribe?(request: AIAudioTranscribeRequest): Promise<{ text: string }>;
  speak?(request: AIAudioSpeakRequest): Promise<{ audioBase64: string }>;
}
