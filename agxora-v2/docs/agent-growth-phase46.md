# AGXORA AI — Phase 46.0 Growth CRM Bridge & Lead Operations

## Purpose

Phase 46.0 wires Growth Campaigns + Operations into the existing CRM stack so
operators can produce **real internal CRM outcomes** from Growth work:

GROWTH PROFILE → CAMPAIGN → OPERATIONS → CRM SYNC (approval) →
CRM CUSTOMER / CONTACT / NOTE → AGENT OS LINK REFS → CONTINUE IN `/dashboard/crm`

This phase does **not** add live publishing, OAuth, analytics, or fake success.

## Explicit limitations

- **NO LIVE SOCIAL PUBLISHING**
- **NO LIVE WEBSITE PUBLISHING**
- **NO LIVE OAUTH**
- **NO REAL / FAKE ANALYTICS**
- **NO FAKE PUBLISHING SUCCESS**
- **NO SECRET STORAGE**
- **NO PHASE 51**
- **NO SECOND CRM DATABASE**
- **NO SECOND AGENT / APPROVAL / AUDIT ENGINE**
- **NO BACKGROUND WORKERS**
- **NO PLATFORM RATE-LIMITING REIMPLEMENTATION**

External website/social publishers remain unavailable and continue to produce
`BLOCKED`, never fake `COMPLETED`.

## Architecture

Agent OS remains the only runtime:

- `agentOsService.enqueueTask()` / `resolveApproval()`
- `AgentApproval` remains the only approval store
- `auditLog` / `StepExecution` remain the audit trail
- `operationsService` remains the Phase 45 operations projection

CRM entities remain in the existing CRM directory / persistence stack
(`crmDirectoryService` / `/api/v1/crm/*`). Agent OS stores **references only**.

Additive domain files live in `features/agents/crm/`:

- `types.ts` — `GrowthCrmLink`, `CampaignCrmSync`, `CrmBridgeResult`
- `adapter.ts` — injectable `CrmBridgeProvider` (directory / memory / unavailable)
- `sync.ts` — idempotent profile → customer/contact/note sync
- `handlers.ts` — real `crm` tool handler
- `index.ts` — exports

## Growth → CRM flow

1. Operator saves a Growth business profile and plans a campaign.
2. Campaign planner includes internal tasks `sync_crm_customer` and `attach_crm_note`.
3. Operator requests CRM sync from Campaigns UI / `/agents/growth/crm/sync`.
4. Operations enqueues a `crm` job (`requiresApproval: true`).
5. On approval, Agent OS runs the CRM tool against the bridge provider.
6. Provider creates or links a CRM customer/contact and may attach a campaign note
   through the existing CRM mutation path (activities append via CRM mutations).
7. Agent OS persists `growthCrmLinks` / `campaignCrmSyncs` refs + deep-link href.
8. Job becomes `COMPLETED` when CRM mutation succeeds.
9. If CRM provider is unavailable → job `BLOCKED` (`crm.unavailable`).
10. If approval is rejected → job `BLOCKED` (`approval.rejected`), never `COMPLETED`.

## Persistence

Agent OS state version is now `6`. `normalizeState()` upgrades version 1–5
payloads and fills:

- `growthCrmLinks: []`
- `campaignCrmSyncs: []`

No CRM entity payloads are duplicated into Agent OS storage. No tokens or secrets.

## Approval behavior

The `crm` tool is sensitive and `requiresApproval: true`. Sync waits for
`AgentApproval`. Rejected approvals never mark CRM jobs or links as completed.

## Blocked behavior

| Condition | Job status |
|-----------|------------|
| CRM mutation success | `COMPLETED` |
| CRM provider unavailable | `BLOCKED` (`crm.unavailable`) |
| Approval rejected | `BLOCKED` (`approval.rejected`) |
| Website/social publisher unavailable | existing Phase 45 `BLOCKED` (`publishing.unavailable`) |

CRM jobs are **not** listed in `EXTERNAL_SIDE_EFFECT_TOOLS`. Successful CRM
writes are internal and may complete even while publish tasks remain blocked.

## Security boundaries

- CRM provider uses existing CRM directory / remote adapter tenancy rules.
- In database mode, remote CRM APIs derive org/workspace from the session actor.
- Client-provided organization hints are not trusted for ownership.
- Agent OS stores customer/contact/note ids and hrefs only — never secrets.
- No new authentication layer.

## UI

Additive controls on existing Agent OS surfaces:

- Campaigns — Sync to CRM + link/status + deep-link
- Growth — linked CRM customer chip
- Operations — CRM job status / blocker copy

CRM dashboard itself is unchanged.

## API

Existing `/agents` prefix gains:

- `GET /agents/growth/crm/link`
- `POST /agents/growth/crm/sync`
- `POST /agents/growth/campaigns/:id/crm-sync`
- reused `POST /agents/approvals/resolve`

## Tests

`app/lib/agents/agentCrmBridge.test.ts` plus Phase 42–45 suites (normalize → v6).

## Validation

- `npm test`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run i18n:validate`
- `npm run i18n:check`

## Numbering note

Platform Phase 46-A/B (rate limiting) already exists on `main`. This document is
**Agent Growth Phase 46.0** (`agent-growth-phase46.md`) and does not replace or
reimplement platform rate limiting.
