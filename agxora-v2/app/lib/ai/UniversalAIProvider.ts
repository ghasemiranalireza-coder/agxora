/**
 * UniversalAIProvider — canonical multi-provider contract.
 * Alias of AIProvider for Phase 7.5 naming clarity.
 */

export type {
  AIProvider as UniversalAIProvider,
  AIChatRequest,
  AIChatResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  AIHealthStatus,
  AIVisionRequest,
  AIAudioTranscribeRequest,
  AIAudioSpeakRequest,
} from "./AIProvider";

export { type AIProvider } from "./AIProvider";
