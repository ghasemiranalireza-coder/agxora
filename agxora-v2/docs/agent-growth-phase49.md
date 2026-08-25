# AGXORA AI — Phase 49.0 Growth CRM Lead Prioritization & Action Queue

## Purpose

Phase 49.0 answers the operator question left open after Phase 48:

> Which Growth-linked CRM leads need my attention first, why, and what
> should I do next?

It adds a **deterministic, read-only Lead Action Queue** projected from
existing Growth CRM state — without ML scoring, fake analytics, a second
CRM database, or a second Agent engine.

## Chosen vertical slice

**Lead Prioritization & Action Queue**

Why this follows Phase 48:

- Phase 48 closed per-lead next-action readiness + follow-up completion.
- Operators still lacked an org-wide prioritized attention queue.
- All required signals already exist in Agent OS v7 + CRM refs.

## Explicit non-goals

- **NO ML / ANALYTICS SCORING**
- **NO FAKE CRM DATA / FAKE ENGAGEMENT / REVENUE / LTV**
- **NO CRM SCHEMA CHANGES**
- **NO SECOND CRM DATABASE / TASK SYSTEM**
- **NO SECOND AGENT / APPROVAL / AUDIT ENGINE**
- **NO BACKGROUND WORKERS**
- **NO OAUTH / SECRETS / OUTBOUND EMAIL**
- **NO AUTO-EXECUTION** of queue recommendations
- **NO NEW DASHBOARD ROUTE / SIDEBAR**
- **NO PHASE 50 / 51**
- **NO PERSISTENCE MIGRATION** (queue is derived)

## Architecture

Agent OS remains the only runtime. Phase 49 is a pure projection:

- Reuses `GrowthCrmLink`, `GrowthCrmFollowUp`, `CrmLinkedLeadState`
- Reuses `evaluateCrmLeadNextAction` (Phase 48) as `phase48NextAction`
- Additive module: `features/agents/crm/prioritize.ts`
- Viewing the queue never creates approvals or mutates CRM

## Domain models

- `CrmLeadPriority`: `CRITICAL | HIGH | MEDIUM | LOW | NONE`
- `LeadPriorityReason`: explainable reason codes
- `LeadRecommendedAction`: deterministic recommended action enum
- `LeadActionItem`: one prioritized lead projection (refs only)
- `LeadActionQueue`: org-scoped sorted queue + counts

## Deterministic prioritization rules

Same input → same priority, score, reasons, and recommended action.

| Priority | Score | When | Recommended action |
|----------|------:|------|--------------------|
| CRITICAL | 100 | Overdue open follow-up | `COMPLETE_OVERDUE_FOLLOW_UP` |
| HIGH | 80 | Failed open follow-up | `RETRY_FAILED_FOLLOW_UP` |
| HIGH | 75 | Blocked open follow-up | `REVIEW_BLOCKED_FOLLOW_UP` |
| HIGH | 70 | Pending due within 3 days | `COMPLETE_PENDING_FOLLOW_UP` |
| MEDIUM | 50 | Pending (not due soon) | `COMPLETE_PENDING_FOLLOW_UP` |
| MEDIUM | 45 | Linked, no open follow-up | `CREATE_FOLLOW_UP` |
| LOW | 20 | Recently completed only / weak or missing link | `CREATE_FOLLOW_UP` / `REVIEW_CRM_LINK` |
| NONE | 0 | No open work | `NO_ACTION` |

**Score formula (deterministic integer bands):**

- Base band by priority as above
- Small fixed adjustments (−5 / −10) for blocked / due-soon / weak-link
  variants — never random, never model-based
- Sort key: priority rank → inverted score → earliest due → company → ids

**Due-soon window:** `LEAD_PRIORITY_DUE_SOON_DAYS = 3` (inclusive).

Historical create `outcome: "created"` / `success: true` on a **failed**
follow-up never produces a healthy/low state — current open status wins.

## Action queue

`buildLeadActionQueue(organizationId)`:

1. One item per org `GrowthCrmLink`
2. Unlinked growth profiles as `missing_crm_link`
3. Attaches reasons, score, recommended action, follow-up status/due, CRM href
4. Sorts deterministically
5. Does **not** persist a duplicate lead store

## API / UI

- `GET /agents/growth/crm/leads/priority` → `{ queue, readOnly: true }`
- CRM tool action `list_lead_priority` / `get_lead_priority`
- Campaigns — Lead Action Queue surface
- Growth — compact queue count / critical hint

Action buttons (optional) reuse existing Phase 46–48 growthService methods
and therefore existing `AgentApproval` rules. Viewing alone creates no
approvals and never marks COMPLETED.

## Persistence

Agent OS state version remains **`7`**.

No new collections. No migration. No duplicate CRM customers.

## Security

- Organization isolation via existing org filters
- Read-only projection — no client-trusted CRM mutations from GET
- No secrets / OAuth

## Tests

`app/lib/agents/agentCrmLeadPriority.test.ts` covers:

1. Overdue → CRITICAL
2. Failed → RETRY
3. Blocked → REVIEW
4. Pending / due-soon priority
5. No follow-up after link → CREATE
6. Completed → lower / no false CRITICAL
7. Stable equal-priority ordering
8. No fake scoring fields
9. Queue GET is read-only
10. Org isolation + persistence stays v7

Phase 42–48 regression suites remain green.
