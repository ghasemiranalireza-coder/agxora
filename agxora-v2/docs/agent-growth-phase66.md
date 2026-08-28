# Phase 66.0 — YouTube Async Publish Operations Completion & Worker Scheduling

Phase 66.0 makes Phase 65 async YouTube publish **production-operable**: platform cron scheduling, bounded worker invocations, correct Operations semantics for `uploading`, and client status polling.

Agent OS remains **v7**. YouTube is still the only live social platform.

## Architecture

```
COMPLETED CreativeProject (object_s3 video, async-eligible)
  → POST /api/v1/agents/creative/publish
      → publishResult.status = uploading (immediate return)

GitHub Actions (every 5 min) — POST /api/v1/internal/creative/publish/worker
  → Repository secrets: AGXORA_APP_URL, AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN
  → Optional Vercel Cron on Pro plans (see deployment notes)
  → Bearer CRON_SECRET or AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN
  → claim due CreativeYouTubeUploadSession (lease/claim)
  → upload up to AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN chunks
     and/or AGXORA_YOUTUBE_WORKER_MAX_WALL_CLOCK_MS_PER_RUN wall clock
  → partial progress: release lease, remain uploading (never terminal-fail)
  → terminal: complete CreativePublishAttempt + persist publishResult

Browser creativeService.runServerProviderPublish
  → POST publish
  → if uploading: poll GET /api/v1/agents/creative/publish/status (backoff)
  → reconcile Operations job when terminal

Operations creative_publish
  → publishResult.uploading → ExecutionResult.status = in_progress
  → job remains VERIFYING (non-terminal) until published/failed/unavailable
```

## Feature flags / configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED` | `false` | Enable async path (Phase 65) |
| `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN` | unset | Worker bearer auth |
| `AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED` | `false` | Cron scheduler readiness gate |
| `AGXORA_YOUTUBE_WORKER_MAX_CHUNKS_PER_RUN` | `4` | Chunk budget per worker run |
| `AGXORA_YOUTUBE_WORKER_MAX_WALL_CLOCK_MS_PER_RUN` | `45000` | Wall-clock budget per worker run |
| `CRON_SECRET` | unset | Vercel Cron `Authorization` bearer when using Vercel Cron (Pro) |

Existing Phase 65 variables (`AGXORA_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN`, session TTL, lease MS, async threshold) are unchanged.

### Scheduler (Hobby-compatible)

Vercel **Hobby** plans only allow **daily** cron jobs. Sub-daily `vercel.json` cron schedules fail deployment. Phase 66 uses **GitHub Actions** (`.github/workflows/creative-publish-worker.yml`) for sub-daily worker scheduling on all plans.

| Repository secret | Purpose |
|-------------------|---------|
| `AGXORA_APP_URL` | Production app base URL (e.g. `https://your-app.vercel.app`) |
| `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN` | Worker bearer token (same value as Vercel env) |

**Vercel Pro (optional):** You may add `agxora-v2/vercel.json` with a per-minute cron instead of or in addition to GitHub Actions.

## Publish readiness (Phase 66 additions)

When async upload is enabled:

| Code | Meaning |
|------|---------|
| `creative_publish_worker_not_configured` | Missing worker token |
| `creative_publish_scheduler_not_configured` | Missing `AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED=true` or GitHub Actions scheduler secrets |

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

## Staging smoke test

1. Deploy with Phase 65 migration applied.
2. Set YouTube publish, OAuth, encryption key, S3 blob store, async upload, worker token, and `AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED=true`.
3. Configure GitHub repository secrets `AGXORA_APP_URL` and `AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN`; enable `.github/workflows/creative-publish-worker.yml`.
4. Request publish via Operations → `publishResult.status=uploading`, job `VERIFYING`.
5. Wait for scheduler/worker cycles; poll status endpoint.
6. Confirm `publishResult.status=published` with `externalId`; Operations job `COMPLETED`.

## API

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/v1/agents/creative/publish` | Actor session |
| `GET` | `/api/v1/agents/creative/publish/status` | Actor session |
| `POST` / `GET` | `/api/v1/internal/creative/publish/worker` | Worker bearer / CRON_SECRET |

## Out of scope

Instagram, TikTok, Facebook, LinkedIn, Agent OS v8, generic job queue, billing, CDN, encryption key rotation, YouTube Shorts API.
