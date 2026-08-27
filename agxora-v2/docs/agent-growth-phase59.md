# AGXORA AI — Phase 59.0 Real Image Creative Generation Provider

## Objective

Give Creative Producer its first **real** media capability: generate an
`IMAGE_AD` through a configured external image API after AgentApproval and
Operations clearance.

If no provider is configured, AGXORA remains honestly unavailable and never
fabricates image URLs, `generated=true`, or completed media.

## Architecture

```
Approved creative_generate
  → existing Operations / ExecutionJob
  → creativeService.runProviderGeneration
       ├─ test/local injected provider (configured, id ≠ none)
       └─ POST /api/v1/agents/creative/generate  (server boundary)
            → requireCurrentActor()
            → CreativeGenerationProvider (OpenAI Images)
            → real asset URL / data URL
  → CreativeProject.productionResult (metadata)
  → AgentsPersistedState v7.creativeProjects
  → CreativeWorkspace preview
```

Reuses:

- Phase 58 Creative Producer, approvals, Operations, tools
- Phase 56–57 org authority + Agent OS server persistence
- Existing `CreativeGenerationProvider` interface

Does **not** create a second Agent OS, approval engine, Operations engine,
worker/scheduler, or persistence system.

## Provider

Selected vendor: **OpenAI Images API** (`POST /v1/images/generations`).

Why:

- Repository already has `AGXORA_OPENAI_API_KEY`
- Matches existing env/provider patterns (email-style selection)
- No extra npm SDK dependency (uses `fetch`)

Default model: `gpt-image-1` (override with `AGXORA_OPENAI_IMAGE_MODEL`).

Phase 59 generates **IMAGE_AD / modality=image only**. Video and animation
requests fail closed with `phase59_image_ad_only`.

## Configuration

```bash
AGXORA_CREATIVE_IMAGE_PROVIDER=none|openai
AGXORA_OPENAI_API_KEY=...                 # required when provider=openai
# AGXORA_OPENAI_IMAGE_MODEL=gpt-image-1   # optional
# AGXORA_OPENAI_BASE_URL=https://api.openai.com/v1
```

- Default provider setting: `none` → unavailable
- `openai` without API key → unavailable (`configured: false`)
- Credentials are **server-only** — never sent to browser, Agent OS state,
  API responses, UI, or logs

## Server boundary

Routes:

- `GET /api/v1/agents/creative/status` — configured flag + modalities (no secrets)
- `POST /api/v1/agents/creative/generate` — runs generation for the actor org

Both require `requireCurrentActor()`.

Client-supplied `organizationId` is never authoritative. Mismatch → `403`.

## Approval flow

Unchanged from Phase 58:

- Planning (`creative`) does not require approval
- `creative_generate` requires AgentApproval and is in `EXTERNAL_SIDE_EFFECT_TOOLS`
- Server re-checks `approvalState === "APPROVED"` before calling the provider
- Rejection → no provider call

## Org isolation

- Actor `organizationId` is forced onto the generation request
- Cross-org creative access remains filtered in Agent OS state
- Generation metadata is persisted under the actor organization only

## Persistence

- Agent OS remains **v7**
- Still uses `creativeProjects[]` metadata (no new collection, no v8)
- Stores provider id, status, reason, and asset refs (URL/mime/dimensions)
- Never stores API keys

## Asset URL policy

GPT Image models return `b64_json` (not hosted HTTPS URLs).

Phase 59 converts successful provider bytes into a usable `data:image/jpeg;base64,...`
URL so the customer can preview/open a **real** generated image without building
an object-storage platform.

If a provider response includes an HTTPS `url`, that URL is preferred.

### Limitations

- Data URLs can be large in Agent OS snapshots — Phase 60 should move durable
  bytes to object storage when needed
- Provider HTTPS URLs (when present) may expire — download promptly
- Manual real-provider verification requires a valid OpenAI key and image-model access

## Honest unavailable behavior

| Condition | Result |
|-----------|--------|
| `AGXORA_CREATIVE_IMAGE_PROVIDER=none` | `PROVIDER_UNAVAILABLE` |
| `openai` without API key | `PROVIDER_UNAVAILABLE` |
| Provider HTTP/timeout/malformed response | `FAILED` (never completed) |
| Empty assets | `FAILED` / `provider_returned_no_assets` |
| Non-image creative type | `FAILED` / `phase59_image_ad_only` |

## UI

Creative workspace:

- Defaults toward `IMAGE_AD`
- Shows truthful provider configured/unavailable status
- On success: image preview + open asset link
- On unavailable/failure: no fake preview / no fake URL
- Explicitly states video/animation/publishing are not available

## Production gate

Phase 57 gate is unchanged. Image generation is **not** a mandatory production
gate requirement. Production without a creative provider stays safely unavailable.

## Manual setup (real provider)

1. Set `AGXORA_CREATIVE_IMAGE_PROVIDER=openai`
2. Set `AGXORA_OPENAI_API_KEY` to a key with Images API access
3. Ensure org verification / model access for GPT Image if required by OpenAI
4. Create an `IMAGE_AD` brief → prepare plan → request production → approve
5. Confirm Creative workspace shows a real preview (not a fabricated URL)

CI tests mock the OpenAI HTTP boundary and do not call the live API.

## Explicit non-goals

- Video generation
- Animation generation
- Voice generation
- Social publishing / Instagram / TikTok / YouTube OAuth
- Ad buying / campaign spend
- Outbound marketing email
- Workers / schedulers
- Persistence v8
- Media editor / transcoding platform
- Object storage / media hosting platform
- Live LLM infrastructure
- Phase 60
