/**
 * AGXORA AI Platform — feature module (Phase 21).
 *
 * Extension points:
 * - Providers: registerAIProvider(id, factory)
 * - Commands: registerAiCommand(command)
 * - Context: setAiActiveContext(ref) from CRM/Projects/Finance routes
 * - Prompts: extend AI_PROMPT_LIBRARY / AI_PROMPT_CATEGORIES
 *
 * UI must call services/hooks only — never provider SDKs.
 */

export * from "./types";
export * from "./providers";
export * from "./services";
export * from "./store";
export * from "./prompts";
export * from "./context";
export * from "./hooks";
export * from "./utils";
export * from "./components";
