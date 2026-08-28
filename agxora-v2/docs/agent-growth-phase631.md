# Phase 63.1 — YouTube Publish Hardening Foundation

Phase 63.1 hardens creative publish for **YouTube only** with Prisma-backed OAuth credentials, publish idempotency locks, server-side `publishResult` persistence, and streamed video reads from object storage.

## Architecture

```
COMPLETED CreativeProject (durable CreativeAsset primary)
  → UI: Request publish
  → Operations enqueue creative_publish { creativeId }
  → AgentApproval (toolId: creative_publish, APPROVED)
  → POST /api/v1/agents/creative/publish
      1. requireCurrentActor() — org authoritative
      2. rateLimit agents.creative_publish
      3. authorizeCreativePublishFromState(publishExecutionJobId)
      4. assert COMPLETED + store-primary durable asset metadata
      5. acquire CreativePublishAttempt lock (unique org + publishExecutionJobId)
      6. verify Prisma SocialPlatformCredential (+ token refresh)
      7. verify Agent OS SocialAccount CONNECTED (credential-backed only)
      8. loadCreativeAssetMedia (buffer images / stream video)
      9. YouTube adapter (env-gated) — VIDEO_AD / SOCIAL_VIDEO only
     10. complete CreativePublishAttempt + server patch Agent OS v7 publishResult
```

### Prisma models (63.1)

| Model | Purpose |
|-------|---------|
| `SocialPlatformCredential` | Encrypted OAuth tokens, org-scoped, `@@unique([organizationId, platform])` |
| `SocialOAuthState` | Hashed single-use PKCE OAuth state |
| `CreativePublishAttempt` | Idempotency + audit, `@@unique([organizationId, publishExecutionJobId])` |

### OAuth (YouTube only)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/v1/agents/social/youtube/connect` | POST | Begin OAuth (PKCE, hashed state) |
| `/api/v1/agents/social/youtube/callback` | GET | Exchange code, upsert credential, patch SocialAccount |
| `/api/v1/agents/social/youtube/disconnect` | POST | Revoke credential, DISCONNECTED |

Env:

- `AGXORA_YOUTUBE_PUBLISH_ENABLED`
- `AGXORA_YOUTUBE_OAUTH_CLIENT_ID`
- `AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET`
- `AGXORA_YOUTUBE_OAUTH_REDIRECT_URI`
- `AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY` (32-byte base64/hex)

## Security model (preserved + extended)

- Actor `organizationId` authoritative on every route
- Exact `publishExecutionJobId` binding — no latest-job fallback
- Fresh `creative_publish` AgentApproval required
- Client `organizationId`, `approvalState`, `assetUrl`, `oauthToken`, `mediaBase64` never authoritative
- OAuth state: hashed, single-use, short-lived, CSRF-safe, PKCE-aware
- Credentials: AES-256-GCM at rest in Prisma only — never in Agent OS, API, errors, or logs
- Idempotency lock acquired after authorization, before adapter
- Concurrent duplicate publish → HTTP 409 `publish_in_flight`
- Phase 57 production gate unchanged
- Failed/unknown publish never fabricates `published: true`
- `SocialAccount.CONNECTED` only when valid Prisma credential exists (server-patched)

## Idempotency semantics

| Attempt status | Behavior |
|----------------|----------|
| `in_flight` (fresh) | Second concurrent request → 409 |
| `in_flight` (stale `expiresAt`) | Reclaim and retry |
| `succeeded` + `externalId` | Safe idempotent replay |
| `failed` without `externalId` | Requires new publish job + approval |
| `unavailable` | Permits later fresh approved attempt |

## Media

- Images: inline BYTEA buffered (`loadCreativeAssetBytes`)
- Videos: `getObjectStream()` from S3/R2-compatible blob store
- No CDN, workers, or cross-request resumable YouTube sessions

## Tests

`app/lib/agents/agentCreativePublishPhase631.test.ts` — adversarial OAuth, idempotency, concurrency, credential gating, YouTube-only adapter, Phase 57 regression.

## Out of scope (63.1)

Instagram, TikTok, Facebook, LinkedIn, ANIMATION, billing, CDN, background workers, social scheduling, Agent OS v8, Phase 64, extending `social_publish` for binary media, cross-request resumable YouTube upload sessions.

## Known limitations

- YouTube upload uses in-process resumable chunks (single request lifecycle; serverless timeout applies)
- Non-YouTube platforms remain honestly unavailable
- Token encryption key rotation requires re-connect
- Client `applyPublishResult` remains secondary to server persistence
