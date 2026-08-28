# Phase 65.0 — Async YouTube Publish & Cross-Request Resumable Upload Foundation

Phase 65.0 adds durable, cross-request YouTube video uploads for large `object_s3` creatives. Agent OS remains **v7**. YouTube is still the only live social platform.

## Architecture

```
COMPLETED CreativeProject (object_s3 video)
  → POST /api/v1/agents/creative/publish
      1. requireCurrentActor() — org authoritative
      2. authorizeCreativePublishFromState(publishExecutionJobId)
      3. acquire CreativePublishAttempt lock
      4. if async-eligible + AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED:
           a. initializeYouTubeResumableUpload
           b. create CreativeYouTubeUploadSession (encrypted resumable URL)
           c. publishResult.status = uploading
           d. return immediately
      5. else: existing synchronous in-request upload (Phase 64 path)

POST /api/v1/internal/creative/publish/worker (Bearer AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN)
  → claim due sessions (lease/claim semantics)
  → refresh OAuth token for session actor org
  → resume upload from persisted byteOffset
  → complete CreativePublishAttempt + persist publishResult
```

## Feature flags (default off)

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED` | `false` | Enable async path |
| `AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES` | `10485760` | Min size for async |
| `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN` | unset | Worker auth |
| `AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS` | `86400000` | Session expiry |
| `AGXORA_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN` | `5` | Worker batch size |
| `AGXORA_YOUTUBE_UPLOAD_SESSION_LEASE_MS` | `300000` | Claim lease |

## Security invariants (unchanged + new)

- `requireCurrentActor()` on user-facing routes
- Actor `organizationId` is authoritative
- Exact `publishExecutionJobId` binding remains mandatory
- Fresh `creative_publish` approval remains mandatory
- Client `assetUrl` / `mediaBase64` / `oauthToken` / privacy overrides rejected
- OAuth credentials encrypted in Prisma only — **never** in upload sessions
- Resumable upload URLs encrypted at rest — never in Agent OS, health, errors, or logs
- Worker token never in health responses, logs, Agent OS, or client responses
- Worker processing is organization-scoped per session
- `published=true` only after confirmed YouTube success with valid `externalId`
- Phase 57 production gate unchanged

## Publish readiness

When async upload is enabled, `evaluateYouTubePublishReadiness()` also requires:

| Code | Meaning |
|------|---------|
| `creative_publish_worker_not_configured` | Missing `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN` |

## Staging smoke test

1. Deploy migration `20260828140000_phase650_youtube_upload_sessions`.
2. Set `AGXORA_YOUTUBE_PUBLISH_ENABLED=true`, OAuth, encryption key, S3 blob store.
3. Set `AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED=true` and `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN`.
4. Connect YouTube for a test org; complete a video creative with `object_s3` asset ≥ threshold.
5. Request publish via Operations → expect `publishResult.status=uploading`.
6. Invoke worker: `curl -X POST -H "Authorization: Bearer $TOKEN" /api/v1/internal/creative/publish/worker`.
7. Poll `GET /api/v1/agents/creative/publish/status?creativeProjectId=...&publishExecutionJobId=...`.
8. Confirm `publishResult.status=published` with `externalId` after worker completes.

## API

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/v1/agents/creative/publish` | Actor session |
| `GET` | `/api/v1/agents/creative/publish/status` | Actor session |
| `POST` | `/api/v1/internal/creative/publish/worker` | Worker bearer token |

## Out of scope

Instagram, TikTok, Facebook, LinkedIn, Agent OS v8, billing, CDN, generic job platform, ANIMATION publish, YouTube Shorts API, encryption key rotation automation.
