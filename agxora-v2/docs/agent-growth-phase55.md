# AGXORA AI — Phase 55.0 CRM Follow-up Due Date & Reschedule (Lead Queue)

## Purpose

Phase 55.0 closes the due-date gap left after Phase 54: Lead Queue priority
bands already depend on `dueAt` (overdue / due-soon), but create paths often
omitted dates and there was no approval-gated reschedule executable.

Operator flow:

Lead Action Queue → `CREATE_FOLLOW_UP` (deterministic `dueAt`) |
`RESCHEDULE_FOLLOW_UP` → Agent OS task → AgentApproval → live follow-up
re-read → update `crmFollowUps.dueAt` → Operations COMPLETED / FAILED /
BLOCKED → queue priority recomputed

## Chosen vertical slice

**CRM Follow-up Due Date & Reschedule**

| Action | Behavior |
|--------|----------|
| `CREATE_FOLLOW_UP` | Always persists a deterministic `dueAt` (operator value or default `today+7` UTC) |
| `RESCHEDULE_FOLLOW_UP` | Allowed for `pending` \| `blocked` \| `failed`; updates `dueAt` only; preserves status |

Undated open follow-ups never count as overdue. Queue recommends
`RESCHEDULE_FOLLOW_UP` for undated pending items.

Preserved unchanged: COMPLETE_* / RETRY / CANCEL / REVIEW / ADVANCE / DISPOSE /
REACTIVATE and overdue priority ordering.

## Explicit non-goals

- **NO WON / DEAL / REVENUE**
- **NO OUTBOUND EMAIL / OAUTH / PUBLISHING / ADS**
- **NO FAKE ANALYTICS / ML**
- **NO STATUS-MACHINE CHANGES** (Phases 51–53)
- **NO SECOND AGENT / APPROVAL / OPERATIONS ENGINE**
- **NO SECOND CRM DATABASE / SCHEMA REWRITE**
- **NO BACKGROUND WORKERS / SCHEDULERS**
- **NO PHASE 56**
- **NO PERSISTENCE VERSION BUMP** (remain v7)

## Architecture

Reuses the Phase 46–54 path only:

- `growthService.executeLeadAction` → `validateLeadAction` (live follow-up)
- Create path applies `defaultFollowUpDueAt` / `normalizeFollowUpDueAt`
- `RESCHEDULE_FOLLOW_UP` → `requestCrmFollowUpReschedule` →
  `reschedule_follow_up` → `rescheduleCrmFollowUp`
- `AgentApproval` + `operationsService` unchanged
- Queue remains a derived read-model

## Validation & concurrency

- Live follow-up re-read before enqueue and before mutation
- Wrong status / missing dueAt → `INVALID`
- Stale concurrent status → `FAILED` (no false `COMPLETED`)
- Organization / profile / follow-up isolation enforced

## Persistence

Agent OS state version remains **`7`**.

- No new collections
- Reuses existing optional `GrowthCrmFollowUp.dueAt`

## Tests

Dedicated suite: `app/lib/agents/agentCrmFollowUpReschedule.test.ts`
