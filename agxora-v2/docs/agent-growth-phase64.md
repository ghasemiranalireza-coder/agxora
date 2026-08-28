# Phase 64.0 — YouTube Publish Production Readiness & Operational Hardening

Phase 64.0 hardens the Phase 63.1 YouTube publish path for production operation: publish readiness gates, incremental stream upload, upload guards, stable error taxonomy, test coverage for deferred gaps, and deploy documentation.

Agent OS remains **v7**. YouTube is the only live social platform.

## Architecture (unchanged core)

```
COMPLETED CreativeProject
  → Operations creative_publish + AgentApproval
  → POST /api/v1/agents/creative/publish
      1. requireCurrentActor() — org authoritative
      2. rateLimit agents.creative_publish
      3. authorizeCreativePublishFromState(publishExecutionJobId)
      4. acquire CreativePublishAttempt lock
      5. credential + SocialAccount gating
      6. loadCreativeAssetMedia (buffer image / stream video)
      7. publishCreativeToYouTube (incremental chunk upload)
      8. complete attempt + server persist publishResult
```

## Phase 64 additions

### Publish readiness

`evaluateYouTubePublishReadiness()` in `app/lib/social/publishReadiness.ts`:

| When | Behavior |
|------|----------|
| `AGXORA_YOUTUBE_PUBLISH_ENABLED` off | `enabled=false`, `ready=true` — no false failure |
| Enabled | Fail closed if OAuth, encryption key, or S3 blob store incomplete |

Issue codes (public-safe):

| Code | Meaning |
|------|---------|
| `youtube_oauth_not_configured` | Missing OAuth client ID/secret/redirect URI |
| `social_oauth_encryption_key` | Missing or invalid 32-byte encryption key |
| `creative_blob_store_not_s3` | Blob store not set to `s3` |
| `creative_blob_s3_not_configured` | S3 bucket/credentials missing |

Exposed via `GET /api/health` → `publishReadiness`.

### Upload reliability

- Incremental chunk upload from stream without merging the full video into memory.
- Max bytes guard aligned with `AGXORA_CREATIVE_VIDEO_MAX_BYTES`.
- Duration guard via `AGXORA_YOUTUBE_UPLOAD_MAX_DURATION_MS` (default 55s).
- Privacy via `AGXORA_YOUTUBE_DEFAULT_PRIVACY_STATUS` (`private` default).

### Error taxonomy

Stable, safe `publishResult.reason` codes:

- `youtube_resumable_init_failed`
- `youtube_chunk_upload_failed`
- `youtube_upload_timeout`
- `youtube_upload_size_exceeded`
- `youtube_upload_finalize_failed`
- `youtube_missing_video_id`

No OAuth tokens, Google response bodies, or secrets in errors or Agent OS.

## Production deployment

### 1. Database

```bash
npx prisma migrate deploy
```

Requires migration `20260828120000_phase631_social_publish` (from Phase 63.1).

### 2. Required environment variables

When `AGXORA_YOUTUBE_PUBLISH_ENABLED=true`:

| Variable | Required |
|----------|----------|
| `AGXORA_YOUTUBE_OAUTH_CLIENT_ID` | Yes |
| `AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET` | Yes |
| `AGXORA_YOUTUBE_OAUTH_REDIRECT_URI` | Yes |
| `AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY` | Yes (32-byte base64 or 64-char hex) |
| `AGXORA_CREATIVE_BLOB_STORE` | `s3` |
| `AGXORA_CREATIVE_BLOB_S3_BUCKET` | Yes |
| `AGXORA_CREATIVE_BLOB_S3_ACCESS_KEY_ID` | Yes |
| `AGXORA_CREATIVE_BLOB_S3_SECRET_ACCESS_KEY` | Yes |
| `AGXORA_CREATIVE_BLOB_S3_ENDPOINT` | Yes (e.g. R2) |

Optional:

| Variable | Default |
|----------|---------|
| `AGXORA_YOUTUBE_DEFAULT_PRIVACY_STATUS` | `private` |
| `AGXORA_YOUTUBE_UPLOAD_MAX_DURATION_MS` | `55000` |
| `AGXORA_CREATIVE_VIDEO_MAX_BYTES` | `104857600` |

Phase 57 production gate (auth, CRM database, Agent OS server, email) remains required independently.

### 3. Google OAuth console setup

1. Create OAuth 2.0 client (Web application) in Google Cloud Console.
2. Add authorized redirect URI matching `AGXORA_YOUTUBE_OAUTH_REDIRECT_URI` exactly.
3. Enable YouTube Data API v3 for the project.
4. Request scopes: `youtube.upload`, `youtube.readonly`.
5. Store client ID/secret in server env only.

### 4. Staging smoke test

1. Confirm `GET /api/health` → `publishReadiness.ready=true`.
2. Connect YouTube from Growth workspace (OAuth flow).
3. Generate a short `VIDEO_AD` or `SOCIAL_VIDEO` creative.
4. Request publish → approve → `POST /api/v1/agents/creative/publish`.
5. Verify `publishResult.published=true` with `externalId` (YouTube video ID).
6. Disconnect YouTube and confirm subsequent publish returns `social_credential_missing`.

## Security (preserved)

- Actor `organizationId` authoritative
- Exact `publishExecutionJobId` binding
- Fresh `creative_publish` approval required
- Client media/token overrides rejected
- Credentials encrypted in Prisma only
- Idempotency lock after auth, before adapter
- Phase 57 gate unchanged
- `published=true` only after confirmed YouTube success with `externalId`

## Tests

`app/lib/agents/agentCreativePublishPhase640.test.ts` — readiness, idempotency gaps, stream upload, OAuth routes, HTTP publish integration.

## Known limitations (unchanged / deferred)

- In-request upload still subject to serverless timeout for very large videos.
- Cross-request resumable sessions → Phase 65+.
- Background workers → Phase 65+.
- Non-YouTube platforms remain unavailable.
- Token encryption key rotation requires re-connect.
- YouTube Shorts `isShort` not differentiated in API.

## Out of scope (64.0)

Instagram, TikTok, Facebook, LinkedIn, billing, CDN, background workers, async job infrastructure, cross-request upload sessions, Agent OS v8, ANIMATION.
