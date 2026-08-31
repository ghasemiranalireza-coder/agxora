/**
 * AGXORA AI Engine — multi-provider intelligence layer.
 *
 * - OpenAI chat uses AGXORA_OPENAI_API_KEY on the server only
 * - Client OpenAIProvider calls /api/v1/ai/chat and never reads the key
 * - Mock remains available for unit tests and explicit mock selection
 */

export {};
