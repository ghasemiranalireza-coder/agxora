# AGXORA AI — Phase 53.0 CRM Status Reactivation (Lead Queue)

## Purpose

Phase 53.0 closes the post-disposition dead-end left by Phase 52: `vip` and
`archived` (and recoverable `inactive`) can return to the working CRM ladder
from the Lead Action Queue — without won/deal semantics, OAuth, outbound
email, publishing, analytics, or a second Agent engine.

Operator flow:

Lead Action Queue → `REACTIVATE_CRM_STATUS` (explicit target when required) →
Agent OS task → AgentApproval → live CRM re-read → `updateCustomer` →
Operations COMPLETED / FAILED / BLOCKED → queue recomputed from live CRM status

## Chosen vertical slice

**CRM Status Reactivation**

| From | To | Notes |
|------|----|-------|
| `vip` | `active` | Explicit target required |
| `vip` | `inactive` | Explicit target required |
| `inactive` | `active` | Deterministic reactivation |
| `archived` | `inactive` | Unarchive only — no skip to active/vip |

Phase 51 conversion and Phase 52 disposition remain unchanged:

| From | To | Action |
|------|----|--------|
| `lead` | `prospect` | ADVANCE |
| `prospect` | `active` | ADVANCE |
| `active` | `vip` \| `inactive` | DISPOSE |
| `inactive` | `archived` | DISPOSE |
| `lead` \| `prospect` | `inactive` | DISPOSE |

No won / closed-won / revenue.

## Explicit non-goals

- **NO WON / CLOSED-WON / DEAL / REVENUE**
- **NO OUTBOUND EMAIL / OAUTH / PUBLISHING / ADS**
- **NO FAKE ANALYTICS / ML**
- **NO AUTOMATIC REACTIVATION** without AgentApproval
- **NO `archived → active|vip` SKIP**
- **NO `inactive → lead|prospect` REVERSE CONVERSION**
- **NO SECOND AGENT / APPROVAL / OPERATIONS ENGINE**
- **NO SECOND CRM DATABASE / SCHEMA REWRITE**
- **NO BACKGROUND WORKERS**
- **NO PHASE 54**
- **NO PERSISTENCE VERSION BUMP** (status lives on existing CRM customer)

## Architecture

Reuses the Phase 51–52 execution path only:

- `growthService.executeLeadAction` → `validateLeadAction` (live CRM read)
- `REACTIVATE_CRM_STATUS` | `DISPOSE_CRM_STATUS` | `ADVANCE_CRM_STATUS` →
  `requestCrmStatusAdvance`
- CRM tool `update_customer_status` → `advanceCrmCustomerStatus`
- `resolveReactivateTarget` / `resolveDispositionTarget` /
  `resolveAdvanceTarget` / `resolveStatusMutationTarget`
- `AgentApproval` + `operationsService` unchanged
- Queue remains a derived read-model with live CRM statuses

## Reactivation rules

- `vip` **always** requires an explicit `targetCrmStatus` (`active` | `inactive`)
- `archived` may **only** go to `inactive`
- `inactive` under REACTIVATE may **only** go to `active` (archive remains DISPOSE)
- No skipped transitions; invalid jumps rejected
- Concurrent/stale live status changes fail safely (`INVALID` / `FAILED`)
- Organization / profile / customer isolation enforced on bridge updates

## Queue / next-action

When no open follow-up and live CRM status is:

- `lead` / `prospect` → recommend **ADVANCE** (conversion preferred)
- `active` → recommend **DISPOSE** with targets `vip` | `inactive`
- `inactive` → recommend **REACTIVATE** → `active` (deterministic; no endless create)
- `vip` → recommend **REACTIVATE** with targets `active` | `inactive`
- `archived` → recommend **REACTIVATE** → `inactive` (unarchive)

Open overdue / failed / blocked / pending follow-ups still outrank status
mutations.

## Operations outcomes

| Condition | Outcome |
|-----------|---------|
| Current tool `outcome: "advanced"` + success | `COMPLETED` |
| CRM unavailable | `BLOCKED` |
| Invalid transition / missing link / mutation error | `FAILED` |
| Approval rejected | `BLOCKED` |

Only the **current** CRM tool step output may establish COMPLETED.

## API / UI

- `POST /agents/growth/crm/leads/:profileId/actions`
  - `action: "REACTIVATE_CRM_STATUS"`
  - `targetCrmStatus` required for `vip` (and when multiple targets)
- Lead Queue CTAs: **Reactivate → Active**, **VIP → Inactive**,
  **Unarchive → Inactive**
- Approvals via existing `POST /agents/approvals/resolve`

## Persistence

Agent OS remains **v7**. No new collections.

## Tests

`app/lib/agents/agentCrmStatusReactivation.test.ts` covers allowed/invalid
transitions, explicit target for vip, approval gating, unavailable → BLOCKED,
mutation failure → FAILED, success → COMPLETED, stale concurrent reject, org
isolation, queue recomputation, no archived→active skip, and persistence v7.

Phases 42–52 suites remain green (Phase 52 vip/archived queue expectations
updated to reactivation).
