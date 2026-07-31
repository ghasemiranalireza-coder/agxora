# AGXORA AI Agent Operating System (AOS)

## Architecture

```
features/agents/
  catalog/         # Default agents + marketplace seed
  tools/           # Provider-based tools (CRM…MCP)
  memory/          # Working · conversation · business · long-term · workspace · agent
  knowledge/       # Company/docs/CRM/policies + vector/RAG placeholders
  planning/        # Goal decomposition · dependencies · progress
  reasoning/       # Multi-step · reflection · self-check · confidence
  orchestration/   # A2A messages · delegation · supervisor · parallel placeholder
  context/         # Workspace · business · workflow · customer · project
  llm/             # OpenAI · Azure · Anthropic · Gemini · Local · Ollama · MCP · Custom
  security/        # Workspace isolation · tool allowlists · sensitive boundaries
  observability/   # Health · usage · errors · performance
  repositories/    # LocalStorage now · REST later
  store/           # Persisted Agent OS state
  services/        # agentOsService (UI-independent execution pipeline)
  hooks/           # useAgentOperatingSystem
  providers/       # AgentOsBridge
  components/      # AgentOperatingSystem workspace
```

Agents execute through `agentOsService` — the UI never owns reasoning or tool calls.

## Agent lifecycle

1. **Register** from catalog/marketplace → `AgentRuntime`
2. **Activate / pause** via status
3. **Enqueue task** → pending → running → completed | failed | cancelled | retrying
4. Pipeline: plan → retrieve knowledge → reason → LLM stub → tools → memory write

## Tool architecture

`registerToolHandler(id, handler)` swaps stubs for live CRM/Projects/Finance/…/MCP backends. Sensitive tools respect `isolateSensitiveTools` + permission checks.

## Memory & knowledge

Memory scopes are first-class records. Knowledge retrieval is keyword-based today; `vector` / `rag` kinds are reserved for future embeddings.

## Execution pipeline

`enqueueTask` → `executeTask` (queue-ready). Retries honor `maxAttempts`. Supervisor can `delegate` / `supervise` between instances.

## Extension guide

1. New agent — add to `DEFAULT_AGENTS` (or register custom id).
2. New tool — catalog entry + `registerToolHandler`.
3. Live LLM — `registerLlmProvider`.
4. Backend persistence — `setAgentsRepository(new RestAgentsRepository(url))`.

## Route

`/dashboard/agents` — lazy Agent OS workspace. Existing `/dashboard/ai` chat workspace remains unchanged.

Dashboard shell (layout, sidebar, header, hero, globe, theme, navigation) is unchanged.
