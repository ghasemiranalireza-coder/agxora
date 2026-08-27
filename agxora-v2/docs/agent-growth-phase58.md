# AGXORA AI — Phase 58.0 Creative Production Orchestration

## Objective

Give Agent OS a truthful foundation for professional marketing creatives:

brief → concepts → script → storyboard → production plan → approval →
Operations job → CreativeGenerationProvider → result

Media rendering is **provider-dependent**. With no provider configured, the
system preserves the plan and returns `PROVIDER_UNAVAILABLE` — it never fabricates
video/image URLs or marks generation completed.

## Architecture

```
Customer request (Creative workspace / creative tool)
  → creativeService (planning, local/deterministic specs)
  → AgentApproval (creative_generate requires approval)
  → Operations ExecutionJob (existing ops engine)
  → CreativeGenerationProvider adapter
  → CreativeProject.productionResult (metadata only)
  → AgentsPersistedState v7.creativeProjects
```

Reuses:

- Agent OS tools / catalog (`creative_producer`)
- `operationsService` / `ExecutionJob`
- `AgentApproval`
- Growth business profile context
- Phase 56–57 org authority and server persistence

Does **not** create a second Agent OS, approval engine, Operations engine,
worker/scheduler, or persistence system.

## Creative lifecycle

Statuses:

`PLANNED` → `READY_FOR_APPROVAL` → (`APPROVED` / ops) → `RUNNING` →
`COMPLETED` | `FAILED` | `PROVIDER_UNAVAILABLE` | `BLOCKED`

Invalid transitions throw.

## Supported creative types

- `VIDEO_AD`
- `SOCIAL_VIDEO`
- `ANIMATION`
- `IMAGE_AD`
- `STORYBOARD`
- `SCRIPT`
- `CREATIVE_CONCEPT`

## Supported platforms (configuration)

- Instagram Reels / Feed
- TikTok
- YouTube Shorts / YouTube
- Facebook

Publishing is **out of scope**.

## Provider abstraction

`CreativeGenerationProvider` (`features/agents/creative/provider.ts`):

- Default: unavailable / not configured
- `generate()` may return `unavailable` | `completed` | `failed`
- Completed requires `generated: true` **and** non-empty asset refs
- Test doubles only via `setCreativeGenerationProvider` in tests

## Approval flow

- Planning tools (`creative`) do not require approval
- `creative_generate` is `requiresApproval: true` and listed in
  `EXTERNAL_SIDE_EFFECT_TOOLS`
- Rejection → creative `BLOCKED`, job blocked with `approval.rejected`
- No approval → provider is not executed

## Operations integration

`creativeService.requestProduction` enqueues `creative_generate`.
Start/approve/retry/cancel use existing Operations APIs.
Blocker code for missing provider: `creative.provider_unavailable`.

## Persistence

- Agent OS remains **v7**
- New array: `creativeProjects` (normalized/defaulted like CRM follow-ups)
- Stores briefs/scripts/storyboards/plans + optional provider asset metadata
- No blob/S3 storage in Phase 58

## Security / org isolation

- All creatives scoped by `organizationId`
- Filtered in `filterStateForOrganization` / `stateContainsForeignOrganization`
- Optional `customerId` / `profileId` soft scope tags never override org
- Server authority remains `requireCurrentActor()` for persisted server mode

## Production behavior

- Phase 57 gate unchanged
- Production must not silently invent media
- Unavailable provider → explicit status + preserved plan

## Provider-unavailable behavior

Default adapter returns `creative_provider_not_configured`.
Creative status becomes `PROVIDER_UNAVAILABLE`.
Job result status `unavailable` with no assets.

## Tests

`app/lib/agents/agentCreativeProduction.test.ts` covers brief/script/plan,
approval rejection, provider unavailable, configured success, org isolation,
transitions, v7 persistence, and Phase 57 gate coherence.

## Explicit non-goals

- OAuth / social publishing
- Ad purchasing / spend
- Video/animation editors
- Fake media generation
- Background workers / schedulers
- Second engines
- Persistence v8
- Phase 59

## Future provider integration

1. Implement a real `CreativeGenerationProvider`
2. Register with `setCreativeGenerationProvider` (server bootstrap)
3. Keep approval + ops gating
4. Optionally add object storage later for AGXORA-owned blobs
