# AGXORA AI — Phase 48.0 Growth CRM Follow-up Completion & Lead Next Action

## Purpose

Phase 48.0 closes the Growth → CRM → Follow-up operator loop started in
Phase 47 and adds deterministic lead next-action readiness:

OPEN FOLLOW-UP → COMPLETE (approval) → OPTIONAL CRM COMPLETION NOTE →
AGENT OS STATUS `completed` → NEXT ACTION UPDATES

Operators can finish open follow-ups through Agent Operations / Campaigns UI /
API — without fake publishing, OAuth, outbound email send, or a second CRM /
Agent engine.

## Explicit limitations

- **NO LIVE SOCIAL / WEBSITE PUBLISHING**
- **NO LIVE OAUTH**
- **NO REAL / FAKE ANALYTICS** (next action is deterministic rule-based)
- **NO FAKE PUBLISHING SUCCESS**
- **NO OUTBOUND EMAIL SEND**
- **NO SECRET STORAGE**
- **NO PHASE 51**
- **NO PHASE 49 (Agent Growth)** in this slice
- **NO SECOND CRM DATABASE**
- **NO SECOND AGENT / APPROVAL / AUDIT ENGINE**
- **NO BACKGROUND WORKERS**
- **NO CRM CUSTOMER STATUS PIPELINE MUTATIONS** (deferred)
- **NO NEW CRM TASK SCHEMA**

## Architecture

Agent OS remains the only runtime:

- `agentOsService.enqueueTask()` / `resolveApproval()`
- `AgentApproval` remains the only approval store
- `auditLog` / `StepExecution` remain the audit trail
- `operationsService` remains the operations projection
- Phase 46 `GrowthCrmLink` remains the CRM entity source of truth
- Phase 47 `GrowthCrmFollowUp` remains the follow-up source of truth

Additive / extended pieces:

- `growthService.requestCrmFollowUpComplete`
- `evaluateCrmLeadNextAction` + extended `CrmLinkedLeadState`
- `completionNoteId` on follow-up records (does not overwrite create `noteId`)
- Campaigns Complete control + next-action labels
- Ops create vs complete status copy
- `POST /agents/growth/crm/follow-ups/:id/complete`

## Domain models

- Reused: `GrowthCrmFollowUp`, `CrmFollowUpResult`, `CrmLinkedLeadState`
- Extended: optional `completionNoteId`
- New: `CrmLeadNextAction` / `CrmLeadNextActionCode`
  - `link_to_crm`
  - `create_follow_up`
  - `complete_overdue_follow_up`
  - `complete_open_follow_up`
  - `none`

## Execution flow

1. Operator has an open (`pending` / `blocked`) follow-up from Phase 47.
2. Campaigns UI / API requests completion (`requestCrmFollowUpComplete`).
3. Operations enqueues `crm` job (`action: complete_follow_up`,
   `growthAction: crm_follow_up_complete`, approval required).
4. On approval, `handleCrmTool` → `completeCrmFollowUp`.
5. Optional completion note is written via existing CRM note mutation.
6. Create `noteId` is preserved; completion note stored as `completionNoteId`.
7. Follow-up becomes `completed`; lead next-action recomputes.
8. Job **COMPLETED** only when the current completion result succeeds.
9. Unavailable → **BLOCKED**; mutation/missing → **FAILED**.
10. Historical create success never overrides a later failed completion.

## Persistence

Agent OS state version remains **`7`**.

- No new collections.
- Additive optional field `completionNoteId` on existing follow-up records.
- `normalizeState()` continues to upgrade versions 1–6 → 7 with
  `crmFollowUps: []`.

No CRM entity payloads are duplicated. No tokens or secrets.

## API / UI

- `POST /agents/growth/crm/follow-ups/:id/complete`
- Campaigns — Complete button on open follow-ups + next-action row
- Growth — next-action chip beside open follow-up count
- Operations — distinct copy for create vs complete CRM jobs

## Security

- CRM mutations still go through `CrmBridgeProvider` → directory / remote APIs.
- Organization isolation unchanged.
- Approval required for complete jobs (sensitive `crm` tool).
- No false COMPLETED from stale historical results.

## Tests

`app/lib/agents/agentCrmFollowUpCompletion.test.ts`:

- happy path Ops → approval → COMPLETED
- unavailable → BLOCKED
- mutation failure → FAILED
- stale create success cannot force COMPLETED after failed complete
- missing follow-up id → FAILED
- next-action overdue / link_to_crm
- complete API route
- normalize prior versions → v7

Plus Phase 42–47 agent regression suites.

## Validation

- Agent tests
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run i18n:validate`
- `npm run i18n:check`

## Numbering note

Platform Phase 48 (CRM notes persistence) already exists on `main`. This
document is **Agent Growth Phase 48.0** (`agent-growth-phase48.md`) and does
not replace or reimplement platform CRM notes persistence.
