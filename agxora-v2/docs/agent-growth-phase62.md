# Phase 62.0 — Paid Video Generation + Object Storage

Phase 62.0 adds **paid video generation** for `VIDEO_AD` and `SOCIAL_VIDEO` creatives, with **durable object blob storage** for video bytes and **inline BYTEA** preservation for `IMAGE_AD` (Phase 60). `ANIMATION` remains explicitly blocked.

## Architecture

```
CreativeWorkspace
  → creativeService.requestProduction() / requestRegenerateProduction()
  → Operations (creative_generate tool) + AgentApproval
  → POST /api/v1/agents/creative/generate
  → generateCreativeImageForActor()  [name retained; handles image + video]
      1. authorizeCreativeGenerationFromState (actor org, exact executionJobId)
      2. canRequestPaidGeneration (type + modality gate)
      3. rate limit (route layer)
      4. getServerCreativeMediaProvider(modality)
      5. provider.generate() — server-only, env-configured
      6. persistProviderAssetsDurably()
           IMAGE → CreativeAssetStore inline_bytea (PostgreSQL BYTEA)
           VIDEO → CreativeBlobStore object_s3 + CreativeAsset DB pointer
      7. productionResult: durable /api/v1/agents/creative/assets/... URLs only
  → Agent OS v7 JSON (no data: URLs, no provider secrets)
```

Asset delivery: authenticated `GET /api/v1/agents/creative/assets/:creativeProjectId/:assetId` loads bytes via `loadCreativeAssetBytes()` (inline or object store proxy).

## Supported creative types

| Type | Modality | Paid generation | Storage backend |
|------|----------|-----------------|-----------------|
| IMAGE_AD | image | Yes (Phase 59/61) | inline_bytea |
| VIDEO_AD | video | Yes (Phase 62) | object_s3 |
| SOCIAL_VIDEO | video | Yes (Phase 62) | object_s3 |
| ANIMATION | animation | **No** | — |

## Provider configuration (server-only)

Video provider is selected independently from image:

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGXORA_CREATIVE_VIDEO_PROVIDER` | `none` | `openai` enables OpenAI Videos API |
| `AGXORA_OPENAI_API_KEY` | — | Shared OpenAI key (never exposed to client) |
| `AGXORA_OPENAI_VIDEO_MODEL` | `sora-2` | Video model id |
| `AGXORA_OPENAI_BASE_URL` | `https://api.openai.com/v1` | Trusted host only |

Image settings (`AGXORA_CREATIVE_IMAGE_PROVIDER`, etc.) are unchanged.

Provider calls occur **only after** authorization, capability checks, and rate limiting. Unconfigured providers return honest `unavailable` / `failed` — never `COMPLETED`.

## Storage model (approved Phase 62 decision)

- **Schema:** `CreativeAsset` extended with `storageBackend`, `objectBucket`, `objectKey`, `durationMs`, `modality`; `bytes` nullable for object-backed rows.
- **Blob store:** S3-compatible (`@aws-sdk/client-s3`), defaulting to Cloudflare R2-style endpoint configuration.
- **No second persistence engine:** reuses `CreativeAssetStore` + new `CreativeBlobStore` abstraction; Agent OS remains v7 snapshot only.

| Variable | Purpose |
|----------|---------|
| `AGXORA_CREATIVE_BLOB_STORE` | `memory` (tests) or `s3` |
| `AGXORA_CREATIVE_BLOB_S3_BUCKET` | Bucket name |
| `AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID` | Access key |
| `AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY` | Secret key |
| `AGXORA_CREATIVE_BLOB_S3_ENDPOINT` | R2/S3 endpoint URL |
| `AGXORA_CREATIVE_BLOB_S3_REGION` | Region (`auto` for R2) |
| `AGXORA_CREATIVE_VIDEO_MAX_BYTES` | Max decoded video size (default 100MB) |
| `AGXORA_CREATIVE_ASSET_STORE` | `database` \| `memory` for metadata/BYTEA |

**Write path (video):** put blob → upsert DB pointer → compensating blob delete on DB failure; old object deleted only after successful replace (Phase 61.1 store-primary).

## Security model

Preserved from Phases 59.1 / 61.1:

- **Actor `organizationId` is authoritative** — client `organizationId` mismatch → forbidden.
- **Exact `executionJobId` binding** — no latest-job fallback.
- **`job.params.regenerate === true`** is the only server authority for replacement; client `regenerate` is ignored.
- **Store-primary policy** — existing durable asset blocks silent re-generation; regenerate requires fresh Operations job.
- **Regenerate failure preservation** — failed provider/storage on authorized regenerate keeps prior durable `productionResult`.
- **Org isolation** on asset GET and store lookups.
- **Rate limiting** on `POST /api/v1/agents/creative/generate` (`agents.creative_generate`).
- **Fail-closed:** storage/provider failures never produce `COMPLETED`.
- **SSRF protection:** provider HTTPS fetches use host allowlists (`httpsAssetFetch.ts`).
- **Secrets:** API keys and S3 credentials are server-only; never returned in API responses or Agent OS.

## Regenerate (Phase 61.1 parity)

1. UI calls `creativeService.requestRegenerateProduction()` when `canRegenerateCompletedCreative()` (image or video).
2. Operations enqueues `creative_generate` with `params.regenerate: true`.
3. Server generation uses `replaceExisting: true` on store put when store-primary + regenerate job.
4. If replacement fails, prior durable asset and Agent OS URLs are preserved.

## Failure semantics

| Condition | Result status | Agent OS COMPLETED? |
|-----------|---------------|---------------------|
| Provider unconfigured | unavailable | No |
| Provider error / timeout | failed | No |
| Blob store not configured (video) | failed (`creative_blob_store_not_configured` / storage failed) | No |
| Storage put failed after provider success | failed | No |
| Regenerate failure with prior durable | failed (generation) | **Yes** (preserved) |

## Known limitations (Phase 62.0)

- **ANIMATION** not implemented; blocked at capability gate.
- **No social publishing / OAuth** (Phase 63+).
- **No billing** integration for video usage.
- **No CDN** — video served through authenticated app route (may buffer full object in memory on GET).
- **OpenAI video provider only** — synchronous poll inside request; long jobs may hit timeout.
- **Single primary asset** per creative (unchanged from Phase 60).
- **Blob store defaults to memory** when S3 env vars absent (suitable for tests; production requires S3/R2 config for video durability across restarts).

## Phase 63 intentionally not started

Social publishing, OAuth, billing, and platform CDN infrastructure are out of scope for 62.0.
