# AGXORA AI — Phase 61.0 / 61.1 IMAGE_AD Production Lifecycle Completion

## Scope

Phase 61 completes the IMAGE_AD production lifecycle on top of Phase 59/60:

- Explicit regenerate workflow (UI + Operations job flag)
- Safe `COMPLETED → READY_FOR_APPROVAL` transition for re-queue
- Failed regenerate preserves durable bytes + Agent OS URL
- Honest blocking for unsupported VIDEO_AD / SOCIAL_VIDEO / ANIMATION paid generation
- HTTPS redirect SSRF hardening (Phase 60.1 medium finding)
- **Phase 61.1:** Server-authoritative regenerate approval binding

**Not in scope:** video, animation provider, social publishing, workers, billing, object storage, CDN, Agent OS v8, Phase 62.

## Architecture / data flow

```
COMPLETED IMAGE_AD (CreativeAssetStore primary + Agent OS v7 URL)
  → UI: Regenerate image
  → creativeService.requestRegenerateProduction()
  → transition COMPLETED → READY_FOR_APPROVAL (productionResult preserved when present)
  → Operations enqueue creative_generate { params.regenerate: true }
  → fresh AgentApproval on that new ExecutionJob
  → approved → runServerProviderGeneration()
  → POST /api/v1/agents/creative/generate
  → authorizeCreativeGenerationFromState (exact executionJobId only)
  → getStoredPrimaryCreativeAsset (store is authoritative)
  → require job.params.regenerate === true when store primary exists
  → OpenAI Images (IMAGE_AD only)
  → CreativeAssetStore.put (upsert; never delete-before-put)
  → new durable URL in productionResult OR honest failure with prior URL/bytes preserved
```

Planning (`createBrief`, script, storyboard, `prepareProductionPlan`) remains available for all creative types.

## Regeneration approval policy (Phase 61.1 enforcement)

**Paid regenerate requires a new approved ExecutionJob with `params.regenerate === true`.**

Server rules:

1. `authorizeCreativeGenerationFromState` resolves **only** `project.executionJobId` — no latest-job fallback.
2. When `CreativeAssetStore` has a primary asset for `(organizationId, creativeProjectId)`, paid generation requires the bound job’s `params.regenerate === true`.
3. The client request body `regenerate` flag is **informational only** and never authorizes spend.
4. Initial-production jobs (`params.regenerate` absent/false) **cannot** authorize paid regenerate, even if the client sends `regenerate: true`.
5. AgentApproval must be `APPROVED`, org-bound, and tied to the bound job.

UI/Operations still enqueue a new regenerate job; the server enforces the binding independently of the browser.

## Durable asset authority (Phase 61.1)

**CreativeAssetStore is the server-authoritative source for “already has durable bytes”.**

- Agent OS `productionResult` may be preserved for UX, but the server also calls `getStoredPrimaryCreativeAsset`.
- If the store has a primary asset, generation without an authorized regenerate job fails closed (`creative_regenerate_job_required`).
- Clearing Agent OS metadata alone (e.g. replanning) does **not** allow bypass.
- `prepareProductionPlan()` preserves existing Agent OS durable metadata for IMAGE_AD when present; bytes are never deleted on replan.

## Paid generation capability

| Creative type | Planning | Paid provider |
|---------------|----------|---------------|
| IMAGE_AD | Yes | Yes (OpenAI Images) |
| VIDEO_AD | Yes | Blocked (`creative_paid_generation_unsupported`) |
| SOCIAL_VIDEO | Yes | Blocked |
| ANIMATION | Yes | Blocked |
| SCRIPT / STORYBOARD / CREATIVE_CONCEPT | Yes | N/A |

Blocking happens at:

- `creativeService.requestProduction()` (client enqueue)
- `generateCreativeImageForActor()` (server boundary)
- OpenAI provider (`phase59_image_ad_only`) — defense in depth

## Failed regenerate preservation

When an **authorized** regenerate job runs and a durable primary already exists:

| Outcome | Agent OS `productionResult` | CreativeAsset bytes | Creative status |
|---------|----------------------------|---------------------|-----------------|
| Provider/storage failure | **Preserved** (OS URL and/or store-backed URL) | **Preserved** | **COMPLETED** (client) |
| Success | New durable URL | Replaced via upsert | COMPLETED |

Honest failure is returned in `result` (`generated: false`, `status: failed`).

## Security changes

### HTTPS redirect hardening (Phase 61.0)

`fetchTrustedHttpsAsset` uses `redirect: "manual"` and re-validates every redirect target against `TRUSTED_PROVIDER_ASSET_HOSTS`.

### Regenerate authorization hardening (Phase 61.1)

- Exact `executionJobId` binding; stale/missing job → forbidden
- Store-primary + `job.params.regenerate` gate before provider
- Client `regenerate` / `approvalState` never authoritative

### Unchanged Phase 59.1 controls

- Actor org authoritative
- Real AgentApproval + ExecutionJob binding
- Rate limit `agents.creative_generate`
- No secrets in responses

## Persistence

- Agent OS v7 unchanged
- No schema migration
- CreativeAsset BYTEA primary store (Phase 60) with `getPrimary` lookup
- No binary/data URLs in Agent OS snapshots

## Tests

- `app/lib/agents/agentCreativeLifecyclePhase61.test.ts`
- `app/lib/agents/agentCreativeRegenerateAuthPhase611.test.ts`
- Phase 57–60 regression suites

## Known limitations

- Regenerate remains IMAGE_AD only.
- Test/local in-process provider may simulate non-image types; production server path blocks them.
- Concurrent approved regenerate jobs may both reach the provider (last store upsert wins) — documented non-blocking race; no distributed lock in Phase 61.1.
- Phase 62 intentionally not started.
