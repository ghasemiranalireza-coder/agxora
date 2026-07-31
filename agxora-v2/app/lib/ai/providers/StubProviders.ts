import { AIError } from "../AIErrorHandler";
import { listModelsForProvider, type AIProviderId } from "../AIModel";
import type {
  AIChatRequest,
  AIChatResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  AIHealthStatus,
  AIProvider,
  AIVisionRequest,
} from "../AIProvider";
import type { AIStreamHandler } from "../AIStreaming";
import { AI_ENV_KEYS } from "../AISettings";

/**
 * Stub provider — interface-complete, not networked.
 * Becomes a real client when env keys are present later.
 */
export abstract class StubAIProvider implements AIProvider {
  abstract readonly id: AIProviderId;
  abstract readonly displayName: string;
  protected abstract readonly envKey: string;

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    void request;
    throw this.notConfigured();
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    void request;
    void onEvent;
    throw this.notConfigured();
  }

  async embeddings(
    request: AIEmbeddingRequest,
  ): Promise<AIEmbeddingResponse> {
    void request;
    throw this.notConfigured();
  }

  async models() {
    return listModelsForProvider(this.id);
  }

  async health(): Promise<AIHealthStatus> {
    const configured = this.isConfigured();
    return {
      ok: false,
      providerId: this.id,
      configured,
      message: configured
        ? `${this.displayName} key detected — network adapter not enabled in this phase`
        : `${this.displayName} not configured (set ${this.envKey})`,
      checkedAt: new Date().toISOString(),
    };
  }

  async toolCalling(request: AIChatRequest): Promise<AIChatResponse> {
    return this.chat(request);
  }

  async vision(request: AIVisionRequest): Promise<AIChatResponse> {
    void request;
    throw this.notConfigured();
  }

  protected isConfigured(): boolean {
    if (typeof process === "undefined") return false;
    const value = process.env[this.envKey];
    return Boolean(value && value.length > 0);
  }

  protected notConfigured(): AIError {
    return new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: `${this.displayName} is architecture-ready. Set ${this.envKey} and enable the network adapter in a later phase.`,
      providerId: this.id,
      retryable: false,
    });
  }
}

export class OpenAIProvider extends StubAIProvider {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI";
  protected readonly envKey = AI_ENV_KEYS.openai;
}

export class AnthropicProvider extends StubAIProvider {
  readonly id = "anthropic" as const;
  readonly displayName = "Anthropic Claude";
  protected readonly envKey = AI_ENV_KEYS.anthropic;
}

export class GoogleGeminiProvider extends StubAIProvider {
  readonly id = "google" as const;
  readonly displayName = "Google Gemini";
  protected readonly envKey = AI_ENV_KEYS.google;
}

export class OpenRouterProvider extends StubAIProvider {
  readonly id = "openrouter" as const;
  readonly displayName = "OpenRouter";
  protected readonly envKey = AI_ENV_KEYS.openrouter;
}

export class OllamaProvider extends StubAIProvider {
  readonly id = "ollama" as const;
  readonly displayName = "Ollama";
  protected readonly envKey = AI_ENV_KEYS.ollama;
}

export class AzureOpenAIProvider extends StubAIProvider {
  readonly id = "azure" as const;
  readonly displayName = "Azure OpenAI";
  protected readonly envKey = AI_ENV_KEYS.azure;
}

/** Local / on-prem LLM endpoint placeholder. */
export class LocalProvider extends StubAIProvider {
  readonly id = "local" as const;
  readonly displayName = "Local Provider";
  protected readonly envKey = AI_ENV_KEYS.local;
}
