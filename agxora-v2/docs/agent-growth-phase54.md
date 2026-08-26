# AGXORA AI — Phase 54.0 CRM Follow-up Lifecycle Control (Lead Queue)

## Purpose

Phase 54.0 closes the follow-up action fidelity gap left after Phases 48–53:
the Lead Action Queue already recommended `COMPLETE_PENDING_FOLLOW_UP` and
`REVIEW_BLOCKED_FOLLOW_UP`, but those were not executable and the Campaigns UI
silently aliased both to `COMPLETE_OVERDUE_FOLLOW_UP`. Cancel was never written
despite `cancelled` existing on `CrmFollowUpStatus`.

Operator flow:

Lead Action Queue → `COMPLETE_PENDING_FOLLOW_UP` |
`REVIEW_BLOCKED_FOLLOW_UP` | `CANCEL_FOLLOW_UP` (plus preserved overdue /
retry / create / status actions) → Agent OS task → AgentApproval → live
follow-up re-read → existing CRM follow-up complete / cancel path →
Operations COMPLETED / FAILED / BLOCKED → queue recomputed

## Chosen vertical slice

**CRM Follow-up Lifecycle Control**

| Action | Allowed live status | Mutation |
|--------|---------------------|----------|
| `COMPLETE_PENDING_FOLLOW_UP` | `pending` only | Existing complete + optional CRM completion note |
| `REVIEW_BLOCKED_FOLLOW_UP` | `blocked` only | Honest retry/complete requiring a real CRM note when CRM is available; CRM unavailable → BLOCKED |
| `CANCEL_FOLLOW_UP` | `pending` \| `blocked` \| `failed` | Agent OS status → `cancelled` only (no outbound) |

Preserved unchanged:

- `CREATE_FOLLOW_UP`
- `COMPLETE_OVERDUE_FOLLOW_UP`
- `RETRY_FAILED_FOLLOW_UP`
- `REVIEW_CRM_LINK`
- `ADVANCE_CRM_STATUS`
- `DISPOSE_CRM_STATUS`
- `REACTIVATE_CRM_STATUS`

## Explicit non-goals

- **NO RESCHEDULING / DUEAT OVERHAUL**
- **NO WON / DEAL / REVENUE**
- **NO OUTBOUND EMAIL / OAUTH / PUBLISHING / ADS**
- **NO FAKE ANALYTICS / ML**
- **NO STATUS-MACHINE CHANGES** from Phases 51–53
- **NO SECOND AGENT / APPROVAL / OPERATIONS ENGINE**
- **NO SECOND CRM DATABASE / SCHEMA REWRITE**
- **NO BACKGROUND WORKERS**
- **NO PHASE 55**
- **NO PERSISTENCE VERSION BUMP** (remain v7 / `crmFollowUps`)

## Architecture

Reuses the Phase 46–53 path only:

- `growthService.executeLeadAction` → `validateLeadAction` (live follow-up read)
- Complete path → `requestCrmFollowUpComplete` → `complete_follow_up` →
  `completeCrmFollowUp` (leadAction-scoped expected statuses; blocked review
  requires CRM mutation)
- Cancel path → `requestCrmFollowUpCancel` → `cancel_follow_up` →
  `cancelCrmFollowUp` (status only)
- `AgentApproval` + `operationsService` unchanged
- Queue remains a derived read-model; cancelled follow-ups leave the open set

## Validation & concurrency

- Live follow-up state is re-read **before enqueue** and again **before mutation**
- Wrong status for the selected action → `INVALID` (enqueue) / `FAILED` (mutate)
- Stale / concurrent status changes never produce false `COMPLETED`
- Organization / profile / customer / follow-up isolation enforced

## Queue / next-action

- Pending (incl. due soon) → recommend **COMPLETE_PENDING_FOLLOW_UP**
- Blocked → recommend **REVIEW_BLOCKED_FOLLOW_UP** (+ explicit Cancel CTA)
- Failed → recommend **RETRY_FAILED_FOLLOW_UP** (+ Cancel CTA)
- Overdue → recommend **COMPLETE_OVERDUE_FOLLOW_UP** (priority unchanged)
- Cancelled → disappear from the open follow-up queue

CampaignWorkspace **no longer** aliases pending/blocked recommendations to
`COMPLETE_OVERDUE_FOLLOW_UP`.

## Persistence

Agent OS state version remains **`7`**.

- No new collections
- No schema / version bump
- Reuses existing `crmFollowUps` records and CRM note mutations for completes

## UI

Lead Queue CTAs:

- Complete Pending
- Review Blocked (Retry / Complete)
- Cancel Follow-up
- Existing Complete Overdue / Retry / Create / Review / Advance / Dispose /
  Reactivate controls preserved

Execution / approval state continues to surface from Operations jobs.

## Tests

Dedicated suite: `app/lib/agents/agentCrmFollowUpLifecycle.test.ts`

Covers approval gating, pending complete, blocked review (CRM available /
unavailable / cancel), cancel for pending/failed, isolation, stale status,
no aliasing, queue recomputation, and Phase 42–53 regression smoke.
