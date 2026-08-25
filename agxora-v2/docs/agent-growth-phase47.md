# AGXORA AI — Phase 47.0 Growth CRM Lead Operations & Follow-up Foundation

## Purpose

Phase 47.0 makes the Phase 46 Growth ↔ CRM bridge operationally useful beyond a
one-time sync:

GROWTH PROFILE → CRM LINK (Phase 46) → FOLLOW-UP ACTION (approval) →
CRM NOTE (real mutation) → AGENT OS FOLLOW-UP REFS → OPERATIONS LEAD STATE

Operators can identify CRM-linked leads, create structured follow-up actions,
and see CRM-linked state inside Agent Operations — without fake publishing,
OAuth, outbound email send, or a second CRM / Agent engine.

## Explicit limitations

- **NO LIVE SOCIAL / WEBSITE PUBLISHING**
- **NO LIVE OAUTH**
- **NO REAL / FAKE ANALYTICS**
- **NO FAKE PUBLISHING SUCCESS**
- **NO OUTBOUND EMAIL SEND** (`email_draft` is a CRM note only)
- **NO SECRET STORAGE**
- **NO PHASE 51**
- **NO PHASE 48 (Agent Growth)** in this slice
- **NO SECOND CRM DATABASE**
- **NO SECOND AGENT / APPROVAL / AUDIT ENGINE**
- **NO BACKGROUND WORKERS**
- **NO NEW CRM TASK SCHEMA** (platform `CrmTask` remains unused)

## Architecture

Agent OS remains the only runtime:

- `agentOsService.enqueueTask()` / `resolveApproval()`
- `AgentApproval` remains the only approval store
- `auditLog` / `StepExecution` remain the audit trail
- `operationsService` remains the operations projection
- Phase 46 `GrowthCrmLink` remains the source of truth for CRM entity refs

CRM entities remain in the existing CRM directory / persistence stack.
Follow-up durable artifacts are **real CRM notes** created through
`CrmBridgeProvider.createNote` → `crmDirectoryService`.

Additive domain files:

- `features/agents/crm/followUp.ts` — create / list / complete / lead state
- Extended `types.ts` — `GrowthCrmFollowUp`, `CrmLinkedLeadState`, …
- Extended `handlers.ts` — `create_follow_up`, `list_follow_ups`,
  `complete_follow_up`, `get_linked_record`
- Extended bridge `listNotes` (read)

## Follow-up flow

1. Operator syncs Growth profile to CRM (Phase 46) → `GrowthCrmLink` exists.
2. Campaign planner includes `schedule_crm_follow_up`.
3. Operator requests follow-up from Campaigns UI / API.
4. Operations enqueues a `crm` job (`action: create_follow_up`, approval required).
5. On approval, Agent OS creates a structured CRM note via the bridge.
6. Agent OS persists `crmFollowUps` refs (note id, customer id, href, kind, status).
7. Job becomes **COMPLETED** when the CRM note mutation succeeds (`externalEffect: false`).
8. If no CRM link → **FAILED** (`missing_link`).
9. If CRM unavailable → **BLOCKED** (`crm.unavailable`).
10. Open follow-ups appear in Operations / Growth / Campaigns lead state.
11. Completing a follow-up may append an optional completion note (real CRM mutation).

`email_draft` kind never claims an email was sent.

## Persistence

Agent OS state version is now `7`. `normalizeState()` upgrades version 1–6
payloads and fills:

- `crmFollowUps: []`

No CRM entity payloads are duplicated. No tokens or secrets.

## Approval behavior

The `crm` tool remains `requiresApproval: true`. Follow-up jobs wait for
`AgentApproval`. Rejected approvals never mark follow-ups as created/completed.

## Operations outcome mapping

| Condition | Job status |
|-----------|------------|
| Follow-up note created (`outcome: created`) | `COMPLETED` |
| Follow-up completed (`outcome: completed`) | `COMPLETED` |
| CRM provider unavailable | `BLOCKED` (`crm.unavailable`) |
| Missing CRM link | `FAILED` |
| CRM mutation error | `FAILED` |
| Approval rejected | `BLOCKED` (`approval.rejected`) |

Follow-up jobs never fall through to COMPLETED without an explicit current
`CrmFollowUpResult` success. Phase 46 sync mapping is unchanged.

## UI

Additive controls on existing `/dashboard/agents` surfaces:

- Campaigns — Create CRM follow-up + open follow-up list
- Growth — open follow-up count on linked CRM chip
- Operations — CRM follow-up status + customer deep-link for CRM jobs

CRM dashboard itself is unchanged.

## API

Existing `/agents` prefix gains:

- `GET /agents/growth/crm/follow-ups`
- `POST /agents/growth/crm/follow-ups`
- `GET /agents/growth/crm/link` now also returns `lead`

## Tests

`app/lib/agents/agentCrmFollowUp.test.ts` plus Phase 42–46 suites
(normalize → v7).

## Validation

- Agent tests
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run i18n:validate`
- `npm run i18n:check`

## Numbering note

Platform Phase 47 (CRM contact persistence) already exists on `main`. This
document is **Agent Growth Phase 47.0** (`agent-growth-phase47.md`) and does
not replace or reimplement platform CRM contact persistence.
