# AGXORA AI — Phase 59.0 / 59.1 Real Image Creative Generation Provider

## Objective

Give Creative Producer its first **real** media capability: generate an
`IMAGE_AD` through a configured external image API after **real** AgentApproval
and Operations clearance.

If no provider is configured, AGXORA remains honestly unavailable and never
fabricates image URLs, `generated=true`, or completed media.

## Architecture

```
Approved creative_generate (Agent OS + Operations)
  → creativeService.runProviderGeneration
       ├─ test/local injected provider (configured, id ≠ none)
       └─ flush Agent OS → POST /api/v1/agents/creative/generate
            → requireCurrentActor()
            → rate limit (agents.creative_generate)
            → load Agent OS state for actor org
            → authorize: owned CreativeProject + APPROVED AgentApproval
                 bound via ExecutionJob (creativeId / executionJobId)
            → build prompt from server-trusted CreativeProject only
            → CreativeGenerationProvider (OpenAI Images)
            → bounded asset validation
            → productionResult (data URLs stripped for persistence)
            → optional session previewAssets (bounded data URLs)
  → CreativeProject.productionResult → AgentsPersistedState v7
  → CreativeWorkspace preview
```

Reuses existing Agent OS, AgentApproval, Operations, persistence v7, and the
Phase 46 rate-limit engine. No second engines.

## Security boundary (Phase 59.1)

### Actor / org

- `requireCurrentActor()` is mandatory
- `actor.organizationId` is authoritative
- Client `organizationId` never authorizes; mismatch → 403

### Approval (real revalidation)

- Client `approvalState` is **informational only** and **never** authorizes generation
- Server loads Agent OS state for the actor org
- Requires a persisted `AgentApproval` with:
  - `toolId === "creative_generate"`
  - `state === "APPROVED"`
  - same `organizationId` as the actor
- Approval is joined through the org-scoped `ExecutionJob` bound to the
  creative (`params.creativeId` and/or `CreativeProject.executionJobId`)
- Missing / rejected / cross-org approval → 403/4xx and **provider is not called**

### Creative project binding

- Server loads `creativeProjectId` from actor-org Agent OS `creativeProjects`
- Missing / unknown / cross-org project → not_found/forbidden; **provider not called**
- Generation input (brief, type, platform, plan, script, storyboard) is built from
  the **persisted** CreativeProject — client prompt fields are ignored for authority

### Rate limiting

- Policy id: `agents.creative_generate`
- Keyed by authenticated user; default **10 / hour** (fail-closed)
- Applied **before** the paid provider call
- Exceeded → HTTP **429**; provider not called

## Provider

Selected vendor: **OpenAI Images API** (`POST /v1/images/generations`).

- Default model: `gpt-image-1` (override `AGXORA_OPENAI_IMAGE_MODEL`)
- API key: `AGXORA_OPENAI_API_KEY` (server-only)
- Base URL: only `https://api.openai.com/v1` is trusted (arbitrary
  `AGXORA_OPENAI_BASE_URL` hosts are ignored)
- IMAGE_AD / modality=image only (`phase59_image_ad_only` otherwise)
- Modules use `server-only` where secrets are handled

## Configuration

```bash
AGXORA_CREATIVE_IMAGE_PROVIDER=none|openai
AGXORA_OPENAI_API_KEY=...
# AGXORA_OPENAI_IMAGE_MODEL=gpt-image-1
# AGXORA_OPENAI_BASE_URL=https://api.openai.com/v1   # non-OpenAI hosts ignored
```

## Asset URL / persistence policy (Phase 59.1)

GPT Image models return `b64_json`. Bounded conversion to
`data:image/jpeg;base64,...` is allowed for **session preview only**.

- Hard fail closed when a data URL exceeds size limits
  (`provider_asset_too_large`) — never silently truncate
- **Agent OS v7 persistence strips data URLs** (keeps mime/dimensions/provider metadata)
- HTTPS provider URLs may be persisted when present and usable
- Persistence remains **v7** (no v8)
- Durable creative asset storage is implemented in **Phase 60** (Postgres BYTEA + authenticated GET)

## Honest unavailable / failure behavior

| Condition | Result |
|-----------|--------|
| Provider unset / missing key | `PROVIDER_UNAVAILABLE` |
| Approval missing/rejected/forged | 4xx; provider not called |
| Project missing/cross-org | 4xx; provider not called |
| Rate limited | 429; provider not called |
| Oversized asset | `FAILED` / `provider_asset_too_large` |
| HTTP/timeout/malformed/empty | truthful `FAILED` / `unavailable` |

## Production gate

Phase 57 unchanged. Image provider is **not** a mandatory production gate
requirement. Unconfigured remains honestly unavailable.

## Explicit non-goals

- Video / animation / voice
- Social publishing / OAuth / ads
- Workers / schedulers
- Persistence v8
- Object storage / media platform (**done in Phase 60** — Postgres BYTEA + authenticated GET)
- Outbound marketing email
- Live LLM infrastructure

## Manual setup (real provider)

1. Server Agent OS persistence with synced creatives/approvals/jobs
2. `AGXORA_CREATIVE_IMAGE_PROVIDER=openai` + valid `AGXORA_OPENAI_API_KEY`
3. Create IMAGE_AD → plan → request production → **approve**
4. Confirm preview; confirm Agent OS snapshot does not store huge data URLs

CI mocks OpenAI HTTP and injects Agent OS state for authorization tests.
