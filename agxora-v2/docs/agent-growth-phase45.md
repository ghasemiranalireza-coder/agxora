# AGXORA AI — Phase 45.0 Growth Execution & Operations Center

## Purpose

Phase 45.0 adds the operational execution layer on top of Agent OS, Phase 43
Growth, and Phase 44 Campaigns:

CAMPAIGN → TASK QUEUE → APPROVAL → EXECUTION → VERIFICATION →
BLOCKED / RETRY / COMPLETED → AUDIT HISTORY

This is an orchestration, observability, and audit phase. It does **not** add
live publishing, OAuth, analytics, or fake success.

## Explicit limitations

- **NO LIVE SOCIAL PUBLISHING**
- **NO LIVE OAUTH**
- **NO REAL ANALYTICS**
- **NO FAKE SUCCESS**
- **NO SECRET STORAGE**
- **NO PHASE 51**

Unavailable adapters return `success: false`, `externalEffect: false`,
`status: "unavailable"`. Jobs become `BLOCKED`, never `COMPLETED`.

## Execution architecture

Phase 45 does **not** add a second engine.

- `agentOsService.enqueueTask()` remains the only runtime
- `AgentApproval` remains the only approval store
- `auditLog` remains the only audit logger
- `StepExecution` remains the Agent OS audit trail
- `ExecutionJob` is an operations projection over Agent OS tasks

Domain files live additively in `features/agents/execution/`:

- existing helpers (`createExecution`, `createApproval`, `createStepExecution`)
- `jobs.ts` — `ExecutionJob`, attempts, events, results
- `queue.ts` — deterministic ordering
- `service.ts` — `operationsService`
- `readiness.ts` — campaign operations readiness

## Queue

`operationsService.enqueue()` creates `QUEUED` jobs. There is no background
worker and no polling loop. Start is explicit.

Order is deterministic:

1. priority (`URGENT` → `HIGH` → `NORMAL` → `LOW`)
2. `queueSeq`
3. id

Controls: enqueue, inspect, prioritize, start, pause, cancel, retry, complete
(only via real success), block.

## Lifecycle

```
QUEUED
  → Start
  → WAITING_FOR_APPROVAL (if the tool requires approval)
  → Approved → READY/RUNNING → VERIFYING → COMPLETED | BLOCKED | FAILED
  → Rejected → BLOCKED
```

If an adapter is unavailable:

`RUNNING → VERIFYING → BLOCKED` with `published = false` / `externalEffect = false`.

## Retry

Default `maxAttempts = 3` for internal tools.

External side-effect tools (`website_publish`, `social_publish`,
`social_schedule`, `campaign_execute`) are **not** retryable (`maxAttempts = 1`).

Retry is refused for:

- approval rejection
- missing connection
- unavailable publisher
- missing credentials
- blocked external integration

Retry appends a new `ExecutionAttempt` and does not erase history.
Retry of approval-gated tools goes through `AgentApproval` again and never
bypasses it.

## Approval integration

`POST /agents/approvals/resolve` remains the resolution API.

`growthService.resolveApproval()` updates campaign/website/social state and
then `operationsService.syncFromApproval()`.

## Campaign integration

Campaign tasks may store `executionJobId`. External blocked jobs mark required
campaign tasks `blocked` and force campaign status `BLOCKED`. A campaign cannot
become `COMPLETED` while required external tasks are blocked.

## Operations UI

`/dashboard/agents` gains an **Operations** tab:

- counts (queue, running, waiting, blocked, failed, completed)
- queue list
- execution detail
- recent events
- valid actions only (no Force Complete)

## Persistence

Agent OS state version is now `5`. `normalizeState()` upgrades version 2–4
payloads and fills:

- `executionJobs: []`
- `executionAttempts: []`
- `executionEvents: []`

Old Phase 42/43/44 localStorage continues to load. No tokens or secrets.

## API

Existing `/agents` prefix:

- `GET /agents/operations`
- `GET /agents/operations/:id`
- `POST /agents/operations/enqueue`
- `POST /agents/operations/:id/start`
- `POST /agents/operations/:id/cancel`
- `POST /agents/operations/:id/retry`
- `GET /agents/operations/events`
- reused `POST /agents/approvals/resolve`

## Audit

Job transitions write `agent.operations.*` events through the existing
`auditLog`. Agent OS still records `agent.execution.*` and `StepExecution`.

## Tests

`app/lib/agents/agentExecution.test.ts` plus existing Phase 42/43/44 files.

## Validation

- `npm test`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run i18n:validate`
- `npm run i18n:check`
