/**
 * LLM provider abstraction — OpenAI, Azure, Anthropic, Gemini, local, Ollama, MCP.
 */

import type { LlmProviderId } from "../types";

export interface LlmCompletionRequest {
  readonly providerId: LlmProviderId;
  readonly system?: string;
  readonly prompt: string;
  readonly temperature?: number;
}

export interface LlmCompletionResult {
  readonly providerId: LlmProviderId;
  readonly text: string;
  readonly simulated: boolean;
  readonly model: string;
}

export interface LlmProviderAdapter {
  readonly id: LlmProviderId;
  readonly displayName: string;
  readonly simulated?: boolean;
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

function stubAdapter(
  id: LlmProviderId,
  displayName: string,
  model: string,
): LlmProviderAdapter {
  return {
    id,
    displayName,
    simulated: true,
    async complete(req) {
      return {
        providerId: id,
        model,
        simulated: true,
        text: `[${displayName} stub] ${req.prompt.slice(0, 180)}`,
      };
    },
  };
}

const adapters = new Map<LlmProviderId, LlmProviderAdapter>([
  ["openai", stubAdapter("openai", "OpenAI", "gpt-placeholder")],
  ["azure_openai", stubAdapter("azure_openai", "Azure OpenAI", "azure-placeholder")],
  ["anthropic", stubAdapter("anthropic", "Anthropic", "claude-placeholder")],
  ["google_gemini", stubAdapter("google_gemini", "Google Gemini", "gemini-placeholder")],
  ["local", stubAdapter("local", "Local LLM", "local-placeholder")],
  ["ollama", stubAdapter("ollama", "Ollama", "ollama-placeholder")],
  ["mcp", stubAdapter("mcp", "MCP Servers", "mcp-placeholder")],
  ["custom", stubAdapter("custom", "Custom Model", "custom-placeholder")],
]);

export function getLlmProvider(id: LlmProviderId): LlmProviderAdapter {
  return adapters.get(id) ?? adapters.get("custom")!;
}

export function listLlmProviders(): readonly LlmProviderAdapter[] {
  return Array.from(adapters.values());
}

/** Customer-facing Agent OS must not list simulated LLM adapters as live providers. */
export function listCustomerFacingLlmProviders(): readonly LlmProviderAdapter[] {
  return listLlmProviders().filter((adapter) => adapter.simulated === false);
}

export function isSimulatedLlmAdapter(adapter: LlmProviderAdapter): boolean {
  return adapter.simulated !== false;
}

export function isSimulatedLlmResult(
  result: Pick<LlmCompletionResult, "simulated" | "text">,
): boolean {
  return (
    result.simulated === true ||
    (result.text.includes("[") && result.text.includes("stub]"))
  );
}

export function registerLlmProvider(adapter: LlmProviderAdapter): void {
  adapters.set(adapter.id, adapter);
}
