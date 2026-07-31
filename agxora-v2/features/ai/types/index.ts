/**
 * AGXORA AI Platform — public types (Phase 21).
 * UI depends only on these contracts — never on provider SDKs.
 */

export type {
  AIProvider,
  AIChatRequest,
  AIChatResponse,
  AIHealthStatus,
} from "@/app/lib/ai/AIProvider";

export type { AIProviderId, AIModelDefinition } from "@/app/lib/ai/AIModel";
export type { AISettings } from "@/app/lib/ai/AISettings";
export type { AIStreamEvent, AIStreamHandler } from "@/app/lib/ai/AIStreaming";

/** Conversation message in the AI workspace store. */
export type AiMessageRole = "user" | "assistant" | "system";

export type AiMessageStatus = "pending" | "streaming" | "complete" | "error";

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
  status: AiMessageStatus;
  error?: string;
  /** Estimated tokens for this message (heuristic). */
  estimatedTokens?: number;
  /** Provider that produced this reply (assistant only). */
  providerId?: string;
  model?: string;
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  messages: AiMessage[];
  /** Optional system prompt override for this conversation. */
  systemPromptOverride?: string;
  /** Soft-delete flag — hidden from lists when true. */
  deleted?: boolean;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  preview: string;
  messageCount: number;
}

/** Prompt library */
export type AiPromptCategory =
  | "crm"
  | "projects"
  | "finance"
  | "marketing"
  | "documents"
  | "automation"
  | "general";

export interface AiPromptTemplate {
  id: string;
  title: string;
  description: string;
  category: AiPromptCategory;
  /** Template body. Use {{variable}} placeholders. */
  body: string;
  tags?: string[];
}

/** AI command palette */
export interface AiCommand {
  id: string;
  label: string;
  description: string;
  /** Prompt body injected into the composer / sent as user message. */
  prompt: string;
  category?: AiPromptCategory | "commands";
  keywords?: string[];
}

/** Context engine — architecture only (no business logic yet). */
export type AiContextEntityType =
  | "customer"
  | "project"
  | "invoice"
  | "document"
  | "dashboard"
  | "contact"
  | "none";

export interface AiContextRef {
  type: AiContextEntityType;
  id?: string;
  label?: string;
  /** Opaque metadata for future grounding — never sent to UI as secrets. */
  meta?: Record<string, string>;
}

export interface AiPlatformContext {
  active: AiContextRef;
  /** Stack of recently focused entities for future multi-context prompts. */
  recent: AiContextRef[];
}

/** Token / usage tracking placeholders */
export interface AiUsageSnapshot {
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  estimatedTotalTokens: number;
  /** Cost placeholder — always null until billing is wired. */
  estimatedCostUsd: number | null;
  providerId: string;
  model: string;
  updatedAt: string;
}

export interface AiPlatformSettingsView {
  providerId: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  streamingEnabled: boolean;
  /** API keys are never exposed — only whether a key is configured. */
  apiKeyConfigured: boolean;
}
