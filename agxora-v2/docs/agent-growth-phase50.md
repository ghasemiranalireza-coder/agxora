# AGXORA AI — Phase 50.0 Lead Action Execution & Conversion Workflow

## Purpose

Phase 50.0 turns the Phase 49 **read-only** Lead Action Queue into a
controlled, approval-aware execution workflow — without inventing a second
Agent OS, approval system, CRM database, or outbound channel.

Operator flow:

Lead Action Queue → select recommended action → Agent OS task →
AgentApproval (when required) → existing CRM mutation → job COMPLETED /
FAILED / BLOCKED → queue recomputed

## Chosen vertical slice

**Lead Action Execution** for the safe subset of Phase 49 recommendations:

| Action | Behavior |
|--------|----------|
| `CREATE_FOLLOW_UP` | Reuses Phase 47 create via Operations + approval |
| `COMPLETE_OVERDUE_FOLLOW_UP` | Reuses Phase 48 complete |
| `RETRY_FAILED_FOLLOW_UP` | Completes a failed follow-up (no duplicate create note) |
| `REVIEW_CRM_LINK` | Read-only review — no approval, no mutation |

## Explicit non-goals

- **NO OUTBOUND EMAIL / SOCIAL OAUTH / WEBSITE PUBLISH / ADS**
- **NO FAKE ANALYTICS / ML SCORING**
- **NO AUTOMATIC EXECUTION** without existing approval rules
- **NO SECOND AGENT / APPROVAL / OPERATIONS ENGINE**
- **NO SECOND CRM DATABASE / SCHEMA REWRITE**
- **NO BACKGROUND WORKERS**
- **NO PHASE 51**
- **NO PERSISTENCE VERSION BUMP** (executions reference existing jobs/tasks)

## Architecture

Agent OS remains the only runtime:

- `growthService.executeLeadAction` → `executeLeadAction` validation
- Routes to `requestCrmFollowUp` / `requestCrmFollowUpComplete`
- `operationsService` + `agentOsService` + `AgentApproval` unchanged
- Queue remains a derived read-model (`buildLeadActionQueue`)
- Latest job status is attached as `LeadActionItem.execution`

## Domain models (additive, ephemeral)

- `LeadExecutableAction`
- `LeadActionExecution` — return/reference object (job/task/follow-up ids)
- `LeadActionExecutionRef` — derived projection on queue items
- `LeadActionExecutionStatus` — maps Operations statuses + `REVIEWED` / `INVALID`

No new Agent OS collections. Persistence stays **v7**.

## Deterministic validation

- Invalid / unsupported action → `INVALID` (no enqueue, no CRM mutation)
- `CREATE_FOLLOW_UP` requires CRM link and **no** open follow-ups
- `COMPLETE_OVERDUE_FOLLOW_UP` requires an open (pending/failed/blocked) follow-up
- `RETRY_FAILED_FOLLOW_UP` requires `status === "failed"`
- `REVIEW_CRM_LINK` always read-only

## Execution outcomes

Reuse existing Operations semantics:

- Approval pending → `WAITING_FOR_APPROVAL`
- Rejection → `BLOCKED`
- CRM unavailable → `BLOCKED`
- Mutation/validation error → `FAILED`
- Successful CRM op → `COMPLETED`
- Review → `REVIEWED` (no job)

Never report COMPLETED unless the underlying CRM operation succeeded.

## API / UI

- `POST /agents/growth/crm/leads/:profileId/actions`
- Body: `{ action, followUpId?, campaignId?, summary?, completionNote? }`
- Returns `{ execution, queue }`
- Approvals still via `POST /agents/approvals/resolve`
- Campaigns Lead Queue shows execution status + Create / Complete / Retry / Review

## Security

- Organization isolation unchanged
- No secrets / OAuth
- REVIEW never mutates
- CRM authorization remains via existing bridge provider

## Tests

`app/lib/agents/agentCrmLeadActionExecution.test.ts` covers create, approval,
rejection → BLOCKED, complete overdue, failed retry (no duplicate create note),
unavailable → BLOCKED, mutation failure → FAILED, invalid action, read-only
review, API endpoint, queue recompute, persistence v7.

Phase 42–49 suites remain green.
