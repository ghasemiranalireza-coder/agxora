# Phase 68.0 — Async Publish Attempt TTL Alignment

Phase 68.0 closes the Phase 67 known limitation where async YouTube publish attempts retained a **15-minute in-flight TTL** while upload sessions remain valid for up to **24 hours**. Agent OS remains **v7**. YouTube is still the only live social platform.

## Problem

```
Async publish POST
  → acquire attempt (expiresAt = now + 15m)
  → create CreativeYouTubeUploadSession (expiresAt = now + 24h)
  → complete attempt status=uploading (expiresAt unchanged before Phase 68)
```

This mismatch could allow reclaim semantics to diverge from the active resumable session window and risk duplicate YouTube upload initialization on edge-case replays.

## Solution

When an attempt transitions to `uploading`:

1. `completeCreativePublishAttempt()` extends `expiresAt` to the bound upload session's `expiresAt` (or `AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS` default).
2. `evaluateExistingAttempt()` for `uploading`:
   - With `publishResult` → always **replay** (idempotent, no duplicate init).
   - Without `publishResult` and expired → **requires_new_job** (no reclaim).

Sync in-request publish continues to use the 15-minute `in_flight` TTL.

## Security invariants (unchanged)

- `requireCurrentActor()` on user-facing routes
- Actor `organizationId` authoritative
- Exact `publishExecutionJobId` binding
- Fresh `creative_publish` approval required
- Encrypted OAuth credentials and resumable URLs
- Constant-time worker authentication
- `published=true` only with confirmed `externalId`
- No secrets in health, status, logs, or Agent OS

## Database

**No migration required.** Existing `CreativePublishAttempt.expiresAt` column is updated in place when status becomes `uploading`.

## Tests

`app/lib/agents/agentCreativePublishPhase680.test.ts` — TTL alignment, replay after stale in-flight TTL, duplicate POST does not re-init YouTube, expired uploading without result requires new job.

## Known limitations (unchanged)

- Retry after terminal failure requires new Operations job + approval
- GitHub Actions 5-minute minimum worker interval
- Cross-session UI recovery remains best-effort (CreativeWorkspace poll)
- YouTube only; non-YouTube platforms unavailable

## Out of scope

Instagram, TikTok, Facebook, LinkedIn, Agent OS v8, billing, CDN, generic job queue, YouTube Shorts API, encryption key rotation automation, ANIMATION publish.
