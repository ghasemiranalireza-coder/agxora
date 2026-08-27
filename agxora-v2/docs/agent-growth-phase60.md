# AGXORA AI — Phase 60.0 Durable Creative Asset Persistence (IMAGE_AD)

## Why storage is required

Phase 59 generates real IMAGE_AD pixels but keeps them only in the session
`previewAssetsByCreativeId` Map. Agent OS v7 correctly strips `data:image/`
payloads so snapshots stay bounded. After refresh or hydrate the customer can
see `generated=true` with **no reopenable image**.

Phase 60 makes a successful IMAGE_AD durable and usable without a media platform.

## Selected backend

**PostgreSQL `BYTEA` via Prisma model `CreativeAsset`** (existing `DATABASE_URL`).

Why:

- No object-storage SDK or vendor already in the repo
- First-customer path already requires Postgres for CRM + Agent OS
- Vercel/serverless has no durable local filesystem
- IMAGE_AD size caps (~300KB decoded) fit lean DB storage for one primary asset

Configure with:

```bash
# default outside tests
AGXORA_CREATIVE_ASSET_STORE=database
# tests / ephemeral only
# AGXORA_CREATIVE_ASSET_STORE=memory
```

**Limitation:** This is not a CDN or multi-cloud blob platform. Large libraries,
video, or high fan-out delivery should move to object storage in a later phase
if needed. Org delete cascades assets via FK.

## Data flow

```
Approved creative_generate (Phase 59 authz + rate limit)
  → OpenAI Images (b64 / https)
  → bound validation (Phase 59 limits)
  → CreativeAssetStore.put(org, creativeId, bytes)
  → CreativeAssetRef.url = /api/v1/agents/creative/assets/{creativeId}/{assetId}
  → Agent OS v7 productionResult (URL + mime + dimensions + provider metadata)
  → CreativeWorkspace uses persisted URL after hydrate (session Map optional)
```

## Security model

- `requireCurrentActor()` on generate + asset GET
- Actor `organizationId` authoritative; client org never authorizes
- Real AgentApproval + ExecutionJob binding unchanged (Phase 59.1)
- Asset GET: org-owned CreativeProject required; store keyed by org + creative + assetId
- Unauthenticated → 401; cross-org / wrong project → 403/404; missing → 404
- `Cache-Control: private, no-store` — not public by URL obscurity
- No client storage paths; no provider secrets in responses
- Rate limit on generate unchanged

## Storage limits

Reuse Phase 59 constants:

- `MAX_CREATIVE_ASSET_DECODED_BYTES` (300_000)
- `MAX_CREATIVE_ASSET_DATA_URL_CHARS` (400_000)
- Allowed MIME: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- `MAX_PRIMARY_ASSETS_PER_CREATIVE = 1`
- Fail closed — no silent truncation

## Retention / cleanup

- One primary row per `(organizationId, creativeProjectId)` — regenerate replaces in place
- Organization delete cascades `creative_assets`
- No TTL sweeper / worker in Phase 60

## Failure semantics

| Condition | Result |
|-----------|--------|
| Provider success + store put failure | `FAILED` / `creative_asset_storage_failed` — **not** COMPLETED |
| Empty / oversize / bad MIME | Failed with stable reason — no fake URL |
| Store misconfigured / DB error | Honest persistence failure |

## Regenerate policy

**No silent paid re-generation.**

If CreativeProject is `COMPLETED` with a durable primary asset URL and the
request does **not** set `regenerate: true`:

- Provider is **not** called
- Result reason: `creative_already_has_durable_asset`

Explicit `regenerate: true` (still requires Phase 59 approval/authz) replaces
the primary asset in place (previous bytes deleted / upserted).

Client transitions still block re-queueing COMPLETED without a new workflow;
Phase 60 enforces the spend guard on the server generate path.

## Agent OS v7 unchanged

`SCHEMA_VERSION = 7`. Durable HTTPS-relative app URLs fit existing
`CreativeAssetRef.url`. No v8. Never store base64 / `data:image/` in Agent OS.

## Explicit non-goals

- Video / animation / voice
- Social OAuth / publishing / ads
- Workers / queues / CDN / media library
- Multi-cloud storage abstraction
- Agent OS v8 / new engines
- Phase 57 gate redesign / Phase 61

## Manual validation

1. Migrate DB (`creative_assets` table)
2. `AGXORA_CREATIVE_ASSET_STORE=database` + OpenAI provider configured
3. IMAGE_AD → approve → generate
4. Hard refresh Agent OS — image still loads via authenticated asset URL
5. Confirm Agent OS JSON has `/api/v1/agents/creative/assets/...` and no `data:image/`
