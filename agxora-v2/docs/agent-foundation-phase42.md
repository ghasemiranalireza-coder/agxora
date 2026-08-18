# AGXORA AI — Phase 42.0 Agent Foundation

## Purpose

Phase 42.0 establishes the reusable execution foundation for future AGXORA
agents without building a full Website Agent, Social Media Agent, or external
autonomous publishing system.

The implementation extends the existing Agent Operating System rather than
replacing it.

## Core domain model

### Agent task

Represents the user-facing unit of work that an agent receives:

- task identity
- organization / runtime ownership
- goal + input payload
- task status
- retry counters
- final output or error

### Agent execution

Represents one bounded execution attempt for a task. The execution lifecycle is
explicit and traceable:

- `IDLE`
- `UNDERSTAND`
- `PLAN`
- `WAITING_FOR_APPROVAL`
- `EXECUTING`
- `VERIFYING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `BLOCKED`

This keeps task state simple while providing lifecycle observability for future
agent orchestration.

### Plan model

Plans remain reusable and agent-agnostic:

- plan id
- task association
- goal
- ordered steps
- dependencies between steps

Each step can reference a tool and is tracked independently.

### Step execution / audit event

Every lifecycle transition or step action produces a `StepExecution` event.
Each event can record:

- execution id
- task id
- step id
- action
- status
- safe input/result payloads
- error
- approval state
- duration
- timestamp

This is the foundation for future execution history, analytics, and debugging.

## Tool abstraction

Tool definitions are extended additively with:

- `requiresApproval`
- `inputSchema`

Existing tools continue to work without adapter rewrites. Approval is enforced
only for explicitly guarded tools.

## Approval model

Sensitive or side-effecting actions can emit an approval request before tool
execution:

- `REQUIRES_APPROVAL`
- `APPROVED`
- `REJECTED`

Execution pauses in `WAITING_FOR_APPROVAL` until a decision is recorded.
Approved executions resume through the existing bounded engine. Rejected
approvals move execution into `BLOCKED`.

## Execution engine

The agent execution engine is intentionally bounded:

1. create task
2. create execution
3. understand goal/context
4. create + validate plan
5. execute eligible steps
6. pause for approval when required
7. resume after approval
8. verify outputs
9. complete with structured result

There is no uncontrolled autonomous loop.

## Persistence

The existing local Agent OS persistence is extended with:

- executions
- approvals
- step execution events

Older localStorage payloads are normalized forward so existing workspaces keep
working.

## Minimal API foundation

Phase 42.0 adds local backend dispatch handlers for:

- listing executions
- listing approvals
- listing execution audit events
- creating tasks
- resolving approvals

This follows the repository's existing `/api` dispatch architecture without
migrating the entire Agent OS onto server persistence yet.

## Future Website Agent / Social Media Agent fit

Future agents can reuse the same primitives:

- task intake
- planning
- tool selection
- approval gating
- step execution audit
- verification
- lifecycle tracking

Website Agent and Social Media Agent should plug in as new agent definitions,
tools, and planning strategies on top of this foundation rather than creating a
parallel runtime.
