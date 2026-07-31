# AGXORA Workflow Automation Engine

## Architecture

```
features/automation/
  types/           # Workflow, nodes, executions, permissions
  event-bus/       # Domain publish / subscribe (loose coupling)
  triggers/        # Trigger catalog (CRM, Projects, Finance, Schedule, Webhook, AI…)
  actions/         # Action registry + handler provider pattern
  conditions/      # Equals, contains, gt/lt, empty, boolean, date, status, custom
  variables/       # Global · Workflow · Runtime · Output
  engine/          # Queue-ready execution (retry, cancel, timeout, path)
  templates/       # Starter business process templates
  repositories/    # LocalStorage now · REST placeholder
  store/           # Persisted commercial automation state
  services/        # workflowService orchestration (UI-independent)
  notifications/   # Failed · Completed · Disabled · Errors
  permissions/     # IAM-aligned workflow.read/write/execute/admin
  analytics/       # Derived KPIs
  hooks/           # useAutomationEngine
  providers/       # AutomationBridge
  components/      # AutomationWorkspace (dashboard, list, editor, history…)
```

The **execution engine never imports UI**. UI calls `workflowService` only.

## Event system

Modules publish via `publishDomainEvent` / `workflowService.publishModuleEvent`.
Active workflows subscribe by trigger type (`TRIGGER_EVENT_MAP`).

## Trigger model

`TriggerType` covers customer/project/invoice/task/document/user events, schedule, webhook, API, AI, and manual.

## Action model

`ActionType` handlers are registered with `registerActionHandler`. Defaults are stubs returning `{ simulated: true }` — swap for CRM/Finance/AI backends without UI changes.

## Extension points

1. **New trigger** — add to `TRIGGER_CATALOG` + event map; publish from the owning module.
2. **New action** — add to `ACTION_CATALOG` + `registerActionHandler`.
3. **Backend** — implement `RestAutomationRepository` and inject via `setAutomationRepository`.
4. **Drag-and-drop canvas** — bind to `WorkflowNode.position` + edges; engine unchanged.
5. **Distributed queue** — replace `WorkflowExecutionEngine.enqueue` with a job producer; keep execution record shape.

## Future AI Agent integration

- `ai.run` action accepts `aiPrompt` with `{{variable}}` interpolation.
- Context is `ActionHandlerContext.variables` + trigger payload.
- Agents can call `workflowService.runWorkflow` or emit `ai.event` to continue chains.

## Routes

- `/dashboard/automation` — AutomationWorkspace (lazy)

Dashboard shell (layout, sidebar, header, hero, globe, theme, navigation) is unchanged.
