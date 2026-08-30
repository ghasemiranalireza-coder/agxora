# Phase 67.0 — Async YouTube Publish Lifecycle Completion & Server-Side Terminal Reconciliation

Phase 67.0 closes terminal lifecycle gaps in the Phase 65–66 async YouTube publish pipeline. Agent OS remains **v7**. YouTube is still the only live social platform.

## Architecture

```
runCreativePublishWorker()
  1. expireStaleYouTubeUploadSessions()
  2. reconcileExpiredYouTubeUploadSessions()  ← NEW
       → terminal-fail CreativePublishAttempt
       → persist publishResult + executionJob.result to Agent OS v7
  3. claimDueYouTubeUploadSessions()
  4. processYouTubeUploadSession()
       → ALL terminal paths persist via persistTerminalCreativePublishForSession()

GET /api/v1/agents/creative/publish/status
  → synthesize terminal failed when session expired/failed but publishResult uploading
  → optionally persist terminal state on read (idempotent)

Client creativeService.runServerProviderPublish (unchanged)
  → poll until terminal → reconcileCreativePublishResult (client store)

CreativeWorkspace (optional background poll)
  → refreshPublishStatusFromServer every 15s while uploading
```

## Lifecycle states

| Layer | Uploading | Terminal success | Terminal failure |
|-------|-----------|------------------|------------------|
| `CreativeYouTubeUploadSession` | `pending`, `uploading` | `completed` | `failed`, `expired` |
| `CreativePublishAttempt` | `uploading`, `in_flight` | `succeeded` | `failed` |
| `CreativeProject.publishResult` | `status=uploading` | `published=true` + `externalId` | `status=failed` + reason |
| `ExecutionJob` | `VERIFYING` + `result.in_progress` | `COMPLETED` + `result.completed` | `FAILED` + `result.failed` |

## Expiry behavior

- Session TTL: `AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS` (default 24h)
- Worker calls `expireStaleYouTubeUploadSessions()` each run
- Expired sessions get `status=expired`, `errorReason=youtube_upload_session_expired`
- Reconciliation immediately terminal-fails bound attempt + Agent OS state

## Reconciliation

`persistTerminalCreativePublishForSession()` is the authoritative server-side helper:

- Organization-scoped via session `organizationId`
- Actor-scoped via session `actorUserId`
- Job-scoped via session `publishExecutionJobId`
- Idempotent: safe on every worker tick and repeated status reads

`reconcileExpiredYouTubeUploadSessions()` processes expired/failed sessions still bound to non-terminal attempts or Agent OS `uploading` state.

## Worker behavior

Worker summary (JSON) now includes:

| Field | Meaning |
|-------|---------|
| `expired` | Sessions marked expired this run |
| `reconciled` | Sessions terminal-reconciled this run |
| `partial` | Budget exhausted; remains uploading |
| `completed` / `failed` | Normal processing outcomes |

All terminal worker paths persist through `persistTerminalCreativePublishForSession()`:

- success (with confirmed `externalId`)
- adapter failure
- asset storage unavailable
- social token refresh failure
- publish attempt not found
- expired session (via reconciliation step)

Partial progress (Phase 66) remains non-terminal.

## Failure reasons (stable codes)

| Code | Meaning |
|------|---------|
| `youtube_upload_session_expired` | Resumable session TTL elapsed |
| `asset_storage_unavailable` | Durable S3 asset missing |
| `social_token_refresh_failed` | OAuth refresh failed |
| `publish_attempt_not_found` | Idempotency record missing |
| `youtube_upload_failed` | Adapter/upload error |

## Idempotency

- Re-running reconciliation on already terminal records returns `reconciled=0`
- `completeCreativePublishAttempt` skipped when attempt already terminal
- Agent OS persist skipped when project/job already match terminal outcome

## Operations semantics

Shared helper `executionResultFromCreativePublish()` ensures client and server use identical semantics:

- `uploading` → `ExecutionResult.status=in_progress`, job `VERIFYING`
- terminal `failed` → `ExecutionResult.status=failed`, job `FAILED`
- `published=true` with `externalId` → `ExecutionResult.status=completed`, job `COMPLETED`

`persistPublishResultForActor()` now persists both `executionJob.status` and `executionJob.result`.

## Scheduler behavior

Phase 66 GitHub Actions scheduler unchanged (every 5 minutes).

Optional strict mode:

| Setting | Location | Behavior |
|---------|----------|----------|
| `AGXORA_CREATIVE_PUBLISH_SCHEDULER_STRICT=true` | App env + GitHub `vars` | Fail closed when scheduler secrets missing |
| default (`false`) | — | Silent skip (dev-safe) |

Never logs secret values.

## Feature flags / configuration

No new required variables. Optional:

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGXORA_CREATIVE_PUBLISH_SCHEDULER_STRICT` | `false` | Fail closed when GitHub scheduler secrets missing |

Existing Phase 65–66 variables unchanged.

## Security invariants (unchanged)

- `requireCurrentActor()` on user-facing routes
- Actor `organizationId` authoritative
- Exact `publishExecutionJobId` binding
- Fresh `creative_publish` approval required
- Client media/token overrides rejected
- OAuth encrypted in Prisma only; resumable URLs encrypted at rest
- No secrets in health/errors/Agent OS/logs/client responses
- Worker org-scoped; constant-time token compare
- `published=true` only with confirmed `externalId`
- Phase 57 production gate unchanged

## Production runbook

1. Deploy Phase 67 app code (no migration required).
2. Verify GitHub secrets: `AGXORA_APP_URL`, `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN`.
3. Set `AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED=true` on Vercel.
4. Optionally set `AGXORA_CREATIVE_PUBLISH_SCHEDULER_STRICT=true` in app + GitHub vars for production fail-closed.
5. Trigger stuck publishes recovery: `POST /api/v1/internal/creative/publish/worker` or wait for next scheduler tick.
6. Confirm worker summary shows `reconciled` for any backlog, then `0` on subsequent runs.
7. Poll `GET /api/v1/agents/creative/publish/status` — must not return `uploading` when session is `expired`.

## API

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/v1/agents/creative/publish/status` | Synthesizes terminal failed when session expired/failed |
| `POST/GET` | `/api/v1/internal/creative/publish/worker` | Summary adds `reconciled` |

## Known limitations

- YouTube remains the only live platform
- Retry after terminal failure requires new Operations job + approval
- Attempt in-flight TTL (15m) vs session TTL (24h) mismatch not resolved
- GitHub Actions 5-minute minimum interval
- Background UI poll is best-effort; server persistence is authoritative

## Out of scope

Instagram, TikTok, Facebook, LinkedIn, Agent OS v8, generic job queue, billing, CDN, YouTube Shorts API, encryption key rotation automation, ANIMATION publish.
