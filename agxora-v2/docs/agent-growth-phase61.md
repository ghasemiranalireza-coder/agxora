# AGXORA AI — Phase 61.0 IMAGE_AD Production Lifecycle Completion

## Scope

Phase 61 completes the IMAGE_AD production lifecycle on top of Phase 59/60:

- Explicit regenerate workflow (UI + server flag)
- Safe `COMPLETED → READY_FOR_APPROVAL` transition for re-queue
- Failed regenerate preserves durable bytes + Agent OS URL
- Honest blocking for unsupported VIDEO_AD / SOCIAL_VIDEO / ANIMATION paid generation
- HTTPS redirect SSRF hardening (Phase 60.1 medium finding)
- Fresh AgentApproval per paid regenerate

**Not in scope:** video, animation provider, social publishing, workers, billing, object storage, CDN, Agent OS v8, Phase 62.

## Architecture / data flow

```
COMPLETED IMAGE_AD (durable /api/... URL in Agent OS v7)
  → UI: Regenerate image
  → creativeService.requestRegenerateProduction()
  → transition COMPLETED → READY_FOR_APPROVAL (productionResult preserved)
  → Operations enqueue creative_generate { regenerate: true }
  → fresh AgentApproval (REQUIRES_APPROVAL)
  → approved → runServerProviderGeneration()
  → POST /api/v1/agents/creative/generate { regenerate: true }
  → Phase 59.1 authz + rate limit unchanged
  → OpenAI Images (IMAGE_AD only)
  → CreativeAssetStore.put (upsert; never delete-before-put)
  → new durable URL in productionResult OR honest failure with prior URL preserved
```

Planning (`createBrief`, script, storyboard, `prepareProductionPlan`) remains available for all creative types.

## Regeneration approval policy (chosen)

**Fresh AgentApproval required for every paid regenerate.**

Rationale:

- Regenerate triggers a new paid provider call (`regenerate: true`).
- Reusing an old approval would silently authorize spend.
- Operations + `creative_generate` already require approval; regenerate enqueues a **new** job with `params.regenerate: true`.
- Server still validates persisted AgentApproval bound to that job (`authorizeCreativeGenerationFromState`).

No silent paid regeneration: without `regenerate: true`, server returns `creative_already_has_durable_asset` and does not call the provider.

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

When `regenerate: true` and a durable primary asset already exists:

| Outcome | Agent OS `productionResult` | CreativeAsset bytes | Creative status |
|---------|----------------------------|---------------------|-----------------|
| Provider/storage failure | **Preserved** (same durable URL) | **Preserved** | **COMPLETED** |
| Success | New durable URL | Replaced via upsert | COMPLETED |

Honest failure is returned in `result` (`generated: false`, `status: failed`); persistence is not overwritten with empty FAILED snapshots.

## Security changes (Phase 61)

### HTTPS redirect hardening

`fetchTrustedHttpsAsset` uses `redirect: "manual"` and re-validates every redirect target with `assertTrustedProviderAssetUrl` against `TRUSTED_PROVIDER_ASSET_HOSTS`. Untrusted redirect → fail closed (`provider_asset_url_not_trusted`). Bounded body read unchanged.

### Unchanged Phase 59.1 controls

- Actor org authoritative
- Real AgentApproval + ExecutionJob binding
- Rate limit `agents.creative_generate`
- No secrets in responses

## Persistence

- Agent OS v7 unchanged
- No schema migration
- CreativeAsset BYTEA primary store (Phase 60)
- No binary/data URLs in Agent OS snapshots

## UI (minimal)

- **Regenerate image** button when `canRegenerateCompletedImage(project)`
- **Request production** disabled for unsupported types
- Warning when selected project cannot reach paid generation
- No workspace redesign, no video player

## Tests

See:

- `app/lib/agents/agentCreativeLifecyclePhase61.test.ts`
- Updated Phase 57–60 regression suites

Covers: regenerate happy path, explicit flag, failed preserve bytes + URL, COMPLETED transition, unsupported types blocked, redirect rejection.

## Known limitations

- Regenerate remains IMAGE_AD only; no video/animation provider in this phase.
- Test/local creative provider may still simulate non-image types in-process; production server path blocks them before paid calls.
- No CDN or object storage; durable URLs remain app-served `/api/v1/agents/creative/assets/...`.
- Phase 62 (video/platform) intentionally not started.
