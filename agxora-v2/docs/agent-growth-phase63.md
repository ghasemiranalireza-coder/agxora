# Phase 63.0 — Creative Distribution Orchestration Foundation

Phase 63.0 wires **COMPLETED** creatives with durable primary assets into the existing Operations + AgentApproval + ExecutionJob architecture for external publish attempts. Platform adapters remain **honestly unavailable** until Phase 63.1.

## Architecture

```
COMPLETED CreativeProject (durable CreativeAsset primary)
  → UI: Request publish
  → creativeService.requestPublish()
  → Operations enqueue creative_publish { creativeId }
  → CreativeProject.publishExecutionJobId := job.id
  → AgentApproval (toolId: creative_publish, APPROVED)
  → POST /api/v1/agents/creative/publish
      1. requireCurrentActor() — org authoritative
      2. rateLimit agents.creative_publish
      3. authorizeCreativePublishFromState(publishExecutionJobId)
      4. assert COMPLETED + store-primary durable asset
      5. map productionPlan.platform + modality → social platform/content type
      6. loadCreativeAssetBytes (server only)
      7. check SocialAccount.state (CONNECTED or honest unavailable)
      8. getSocialAdapter(...).publish* (unavailable in 63.0)
      9. persist CreativeProject.publishResult (Agent OS v7 metadata only)
```

Reuses:

- Operations / ExecutionJob / AgentApproval (no second engine)
- Agent OS v7 (`publishResult`, `publishExecutionJobId` on `CreativeProject`)
- `CreativeAssetStore` + blob store for server-side media load
- `SocialPlatformAdapter` interface (`getSocialAdapter`)

Does **not** create:

- OAuth flows or token storage
- Live Instagram/TikTok/YouTube APIs
- Background workers / schedulers
- Billing / CDN / public asset URLs

## Tooling

| Tool | Purpose |
|------|---------|
| `creative_publish` | Approval-gated external publish side effect |
| `creative_generate` | Unchanged — paid media generation only |

`publishExecutionJobId` is separate from `executionJobId` (generate/regenerate binding).

## Security model

Preserved from Phases 59–62:

- Actor `organizationId` authoritative
- Exact `publishExecutionJobId` binding — no latest-job fallback
- Fresh `creative_publish` AgentApproval required (`toolId` match, `approvalId` on job)
- `creative_generate` approval cannot authorize publish
- Client `organizationId`, `approvalState`, `assetUrl`, `assetId`, OAuth tokens never authoritative
- Rate limit `agents.creative_publish`
- Fail-closed: unavailable adapter / disconnected account → not `published: true`
- Failed publish preserves `productionResult` and durable asset bytes
- No binary/data URLs/tokens in Agent OS JSON

## Failure semantics

| Condition | `publishResult` | `productionResult` / asset |
|-----------|-----------------|----------------------------|
| Disconnected account | `unavailable` / `social_account_disconnected` | Preserved |
| Unavailable adapter | `unavailable` | Preserved |
| Auth failure | HTTP 4xx — no adapter call | Preserved |
| Missing durable asset | HTTP 4xx — no adapter call | Preserved |
| Idempotent replay (job already published) | Prior result returned | Preserved |

## Known limitations (Phase 63.0)

- All social adapters return `unavailable` by default
- No OAuth / connected-account UI (accounts remain `DISCONNECTED` unless test-injected)
- No live platform upload
- No streaming upload (Phase 63.1)
- No billing integration
- ANIMATION publish blocked

## Phase 63.1 (future — not implemented)

- Prisma OAuth token persistence
- First live platform adapter (e.g. YouTube)
- Streaming asset load for large video publish
- Connect/disconnect UI

## Tests

`app/lib/agents/agentCreativePublishPhase630.test.ts` — adversarial publish auth, cross-org, client override rejection, disconnected account, idempotent replay, production preservation.

## Explicit non-goals

- Extending `social_publish` for creative media
- Agent OS v8
- ANIMATION paid generation or publish
- `social_schedule` live execution
- Billing / usage metering
- CDN / public asset delivery
