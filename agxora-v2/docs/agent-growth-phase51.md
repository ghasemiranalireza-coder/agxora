# AGXORA AI — Phase 51.0 CRM Lead Status Advancement (Conversion Pipeline)

## Purpose

Phase 51.0 closes the Growth → CRM conversion loop after Phase 50 Lead Action
Execution:

Lead Action Queue → `ADVANCE_CRM_STATUS` → Agent OS task → AgentApproval →
live CRM customer status update → Operations COMPLETED / FAILED / BLOCKED →
queue / next-action recomputed from **live** CRM status

Operators can advance linked CRM customers through a conservative conversion
ladder without OAuth, outbound email, publishing, analytics, or a second
Agent / CRM engine.

## Chosen vertical slice

**CRM Lead Status Advancement from the Lead Action Queue**

| From | To | Notes |
|------|----|-------|
| `lead` | `prospect` | First conversion step after CRM link |
| `prospect` | `active` | Second conversion step |

Arbitrary jumps (e.g. `lead` → `active`, `lead` → `vip`) are rejected.
No won / closed-won / deal semantics.

## Explicit non-goals

- **NO OUTBOUND EMAIL / SOCIAL OAUTH / WEBSITE PUBLISH / ADS**
- **NO FAKE ANALYTICS / ML SCORING / FAKE REVENUE**
- **NO WON / CLOSED-WON / DEAL PIPELINE**
- **NO AUTOMATIC ADVANCEMENT** without AgentApproval
- **NO SECOND AGENT / APPROVAL / OPERATIONS ENGINE**
- **NO SECOND CRM DATABASE / SCHEMA REWRITE**
- **NO BACKGROUND WORKERS**
- **NO PHASE 52**
- **NO PERSISTENCE VERSION BUMP** (status lives in existing CRM customer)

## Architecture

Agent OS remains the only runtime:

- `growthService.executeLeadAction` → `validateLeadAction` (live CRM read)
- `growthService.requestCrmStatusAdvance` → `operationsService` enqueue
- CRM tool action `update_customer_status` → `advanceCrmCustomerStatus`
- `CrmBridgeProvider.updateCustomer` → existing CRM directory `updateFromDraft`
- `AgentApproval` unchanged
- Queue remains a derived read-model (`buildLeadActionQueue` + live statuses)

## Status transition policy

Deterministic map in `features/agents/crm/status.ts`:

- `lead` → `prospect` only
- `prospect` → `active` only
- `active` / `inactive` / `vip` / `archived` → no advance

Validation and mutation **always re-read** the live CRM customer. Stale Lead
Queue / GrowthCrmLink outcome is never the mutation authority. If the
requested transition is no longer valid (concurrent change), the action fails
safely (`INVALID` at validate / `FAILED` at execute) without mutating.

## Approval flow

1. Operator selects Advance Status on a recommended queue item.
2. `ADVANCE_CRM_STATUS` validates link + live status + allowed next step.
3. Operations enqueues `crm` / `update_customer_status` (`requiresApproval: true`).
4. Job waits on existing `AgentApproval`.
5. On approve, handler re-reads CRM and applies the transition (+ optional note).
6. On reject, job becomes `BLOCKED` — CRM status unchanged.

## Operations outcomes

| Condition | Outcome |
|-----------|---------|
| Current tool result `outcome: "advanced"` + success | `COMPLETED` |
| CRM unavailable | `BLOCKED` |
| Invalid transition / missing link / mutation error | `FAILED` |
| Approval rejected | `BLOCKED` |

`outcomeFromTask` for status advance reads **current** CRM tool step output
only. Historical GrowthCrmLink / sync outcomes never produce COMPLETED.

## Queue / next-action behavior

When a linked lead has **no open follow-up** and live CRM status is:

- `lead` → recommend `ADVANCE_CRM_STATUS` → `prospect`
- `prospect` → recommend `ADVANCE_CRM_STATUS` → `active`

This replaces the endless `CREATE_FOLLOW_UP` loop for those statuses.
Follow-up create/complete/retry/review recommendations remain unchanged when
open follow-ups exist. The queue stays read-only until the operator executes.

## Persistence

Agent OS remains **v7**. No new collections. CRM customer `status` in the
existing CRM directory is the source of truth.

## API / UI

- `POST /agents/growth/crm/leads/:profileId/actions` with
  `action: "ADVANCE_CRM_STATUS"` and optional `targetCrmStatus`
- Campaigns Lead Queue shows current → target status and an Advance Status CTA
- Approvals still via `POST /agents/approvals/resolve`

## Security

- Organization isolation on Growth profile, CRM link, and CRM customer
- Bridge `updateCustomer` rejects org mismatch
- No secrets / OAuth

## Tests

`app/lib/agents/agentCrmLeadStatusAdvancement.test.ts` covers lead→prospect,
prospect→active, invalid jumps, missing link, unavailable → block, mutation
failure, approval rejection, approval-before-mutation, stale concurrent
reject, no endless create-follow-up, org isolation, no duplicate mutate,
persistence v7, and the actions API.

Phases 42–50 suites remain green.
