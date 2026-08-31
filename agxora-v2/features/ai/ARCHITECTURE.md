# AGXORA AI Platform — Phase 21

## Architecture

Feature module at `features/ai/` — provider-independent enterprise AI foundation used by future CRM, Projects, Finance, Documents, Automation, Analytics, and Knowledge modules.

```
features/ai/
  components/   # Workspace UI (lazy-loaded from /dashboard/ai)
  hooks/        # Selector-friendly React bindings
  providers/    # Re-exports of AIProvider implementations (not for UI)
  services/     # Sole generation entry (aiPlatformService)
  store/        # Conversations + usage tracker (LocalStorage)
  prompts/      # Prompt library + command registry
  context/      # Context engine architecture (no business logic yet)
  types/        # Public contracts
  utils/        # IDs, tokens, markdown
```

Core engine remains in `app/lib/ai/` (AIEngine, AIProvider, factory, settings). The platform feature wraps it for the workspace without exposing provider details to UI.

## Provider layer

- `AIProvider` interface (chat / stream / embeddings / health / tools / vision)
- Implementations: OpenAI, Anthropic, Google, OpenRouter, Ollama, **Azure OpenAI**, **Local**, Mock
- Factory registration via `registerAIProvider` — pluggable without UI changes
- OpenAI chat is live when `AGXORA_OPENAI_API_KEY` is set (server-side only)
- Mock remains available for unit tests; production errors are not replaced with mock text

## Chat workspace (`/dashboard/ai`)

Conversation list with pin / rename / delete / archive / search, streaming-ready replies, typing indicator, retry, copy, markdown + code highlighting, timestamps, auto-scroll, prompt library, and AI command palette (⌘⇧K / Ctrl⇧K).

## Extension points

| Concern | API |
|--------|-----|
| New provider | `registerAIProvider(id, () => new MyProvider())` |
| New AI command | `registerAiCommand({ id, label, description, prompt, keywords })` |
| Entity grounding | `setAiActiveContext({ type, id, label })` |
| Prompt templates | extend `AI_PROMPT_LIBRARY` |
| Usage / cost | `aiUsageTracker` + `estimateCostUsd` placeholder |

## Settings

Settings → AI: provider (incl. Azure / Local), model, temperature, top-p, max tokens, system prompt, streaming, API-key management placeholder. Keys never stored in client settings (`AI_ENV_KEYS` only).

## Security

UI → hooks → `generateAiReply` → `AIEngine` → provider. No direct provider imports from components.

## Compatibility

Dashboard shell (layout, sidebar, header, hero, globe, theme, global nav) is unchanged. Existing `ChatPanel` on the home dashboard continues via the chat adapter.
