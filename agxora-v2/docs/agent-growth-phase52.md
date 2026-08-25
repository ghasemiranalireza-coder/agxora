# AGXORA AI — Phase 52.0 CRM Post-Active Status Disposition (Lead Queue)

## Purpose

Phase 52.0 completes the CRM status pipeline after Phase 51 conversion
(`lead → prospect → active`) by adding **disposition** transitions from the
Lead Action Queue — without won/deal semantics, OAuth, outbound email,
publishing, analytics, or a second Agent engine.

Operator flow:

Lead Action Queue → `DISPOSE_CRM_STATUS` (explicit target) → Agent OS task →
AgentApproval → live CRM re-read → `updateCustomer` → Operations COMPLETED /
FAILED / BLOCKED → queue recomputed from live CRM status

## Chosen vertical slice

**CRM Post-Active Status Disposition**

| From | To | Notes |
|------|----|-------|
| `active` | `vip` | Explicit target required |
| `active` | `inactive` | Explicit target required |
| `inactive` | `archived` | Single disposition exit |
| `lead` | `inactive` | Dead opportunity (API-allowed) |
| `prospect` | `inactive` | Dead opportunity (API-allowed) |

Phase 51 conversion remains unchanged:

| From | To |
|------|----|
| `lead` | `prospect` |
| `prospect` | `active` |

`archived` and `vip` have no further disposition. No won / closed-won / revenue.

## Explicit non-goals

- **NO WON / CLOSED-WON / DEAL / REVENUE**
- **NO OUTBOUND EMAIL / OAUTH / PUBLISHING / ADS**
- **NO FAKE ANALYTICS / ML**
- **NO AUTOMATIC DISPOSITION** without AgentApproval
- **NO SECOND AGENT / APPROVAL / OPERATIONS ENGINE**
- **NO SECOND CRM DATABASE / SCHEMA REWRITE**
- **NO BACKGROUND WORKERS**
- **NO PHASE 53**
- **NO PERSISTENCE VERSION BUMP** (status lives on existing CRM customer)

## Architecture

Reuses the Phase 51 execution path only:

- `growthService.executeLeadAction` → `validateLeadAction` (live CRM read)
- `DISPOSE_CRM_STATUS` | `ADVANCE_CRM_STATUS` → `requestCrmStatusAdvance`
- CRM tool `update_customer_status` → `advanceCrmCustomerStatus`
- `resolveDispositionTarget` / `resolveAdvanceTarget` / `resolveStatusMutationTarget`
- `AgentApproval` + `operationsService` unchanged
- Queue remains a derived read-model with live CRM statuses

## Disposition rules

- `active` **always** requires an explicit `targetCrmStatus` (`vip` | `inactive`)
- No skipped transitions; invalid jumps rejected
- Concurrent/stale live status changes fail safely (`INVALID` / `FAILED`)
- Organization / profile / customer isolation enforced on bridge updates

## Queue / next-action

When no open follow-up and live CRM status is:

- `lead` / `prospect` → recommend **ADVANCE** (conversion preferred)
- `active` → recommend **DISPOSE** with targets `vip` | `inactive`
- `inactive` → recommend **DISPOSE** → `archived`
- `vip` / `archived` → **NO_ACTION** (no endless CREATE_FOLLOW_UP)

`getCrmLinkedLeadState` accepts optional live `crmStatus` so Growth/API lead
state matches the queue when status is loaded.

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
  - `action: "DISPOSE_CRM_STATUS"`
  - `targetCrmStatus` required for `active` (and when multiple targets)
- Lead Queue CTAs: **Mark VIP**, **Mark Inactive**, **Archive**
- Approvals via existing `POST /agents/approvals/resolve`

## Persistence

Agent OS remains **v7**. No new collections.

## Tests

`app/lib/agents/agentCrmStatusDisposition.test.ts` covers allowed/invalid
transitions, explicit target for active, approval gating, unavailable →
BLOCKED, mutation failure → FAILED, success → COMPLETED, stale concurrent
reject, org isolation, queue recomputation, archived → NO_ACTION, no endless
create after disposition, and persistence v7.

Phases 42–51 suites remain green.
