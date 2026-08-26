# AGXORA AI — Phase 56.0 Agent OS Server Persistence (Growth CRM Operator State)

## Purpose

Phase 56.0 removes the production dependency on browser `localStorage` for the
Growth/CRM Agent OS operator state. State becomes organization-scoped and
server-durable so multi-session / multi-device operators share one source of
truth.

```
Agent OS services → agentsStore → RestAgentsRepository
  → GET/PUT /api/v1/agents/os-state
  → AgentOsState (Postgres JSON, v7 payload)
```

## Persistence

- **AgentsPersistedState remains version `7`** (no v8).
- One Prisma row per organization: `agent_os_states` (`AgentOsState`).
- Payload is the existing v7 snapshot, org-filtered before write.
- `LocalAgentsRepository` remains for demo/local (`NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE=local`).
- Server mode (`=server`) uses `RestAgentsRepository` — **no silent localStorage fallback**.

## Security

- `requireCurrentActor()` derives `organizationId` from session membership.
- Client-supplied `organizationId` is never authoritative.
- Cross-org records are stripped on PUT; GET returns only the actor's org.

## Hydration

- `agentsStore.hydrateAsync({ force, organizationId })` supports force rehydrate.
- Org switch / logout clears prior in-memory org state before loading the next.
- Server mode: `AgentOsBridge` always force-hydrates from the API.

## Explicit non-goals

- NO Phase 57 production gate / email / onboarding bind
- NO Phase 58 UI nav / date picker / publishing demotion
- NO won/deal/email/OAuth/publishing/workers
- NO second Agent / Approval / Operations engine
- NO Lead Queue semantic changes
- NO automatic upload of arbitrary localStorage demo data to production

## Tests

Dedicated suite: `app/lib/agents/agentOsServerPersistence.test.ts`
