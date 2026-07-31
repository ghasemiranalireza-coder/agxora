/**
 * Workflow service — orchestration layer between store, engine, and event bus.
 */

import {
  publishDomainEvent,
  subscribeDomainEvent,
  TRIGGER_EVENT_MAP,
} from "../event-bus";
import { WorkflowExecutionEngine } from "../engine";
import { automationStore } from "../store";
import { getWorkflowTemplate } from "../templates";
import { notifyWorkflowEvent } from "../notifications";
import type {
  TriggerType,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowSettings,
  WorkflowStatus,
} from "../types";
import { DEFAULT_WORKFLOW_SETTINGS } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

const engine = new WorkflowExecutionEngine({
  onUpdate: (execution) => {
    automationStore.upsertExecution(execution);
  },
});

let busWired = false;

export function ensureAutomationEventSubscriptions(): void {
  if (busWired) return;
  busWired = true;
  subscribeDomainEvent("*", (event) => {
    const workflows = automationStore
      .listWorkflows(event.organizationId)
      .filter((w) => w.status === "active");
    for (const wf of workflows) {
      const trigger = wf.nodes.find((n) => n.kind === "trigger");
      if (!trigger || trigger.kind !== "trigger") continue;
      const expected =
        TRIGGER_EVENT_MAP[trigger.config.triggerType] ??
        trigger.config.triggerType;
      if (expected !== event.type && event.type !== "automation.manual") continue;
      if (event.type === "automation.manual" && trigger.config.triggerType !== "manual") {
        continue;
      }
      void workflowService.runWorkflow(wf.id, {
        triggeredBy: trigger.config.triggerType,
        payload: event.payload as Record<string, unknown>,
      });
    }
  });
}

export const workflowService = {
  ensureWorkspace(organizationId: string): void {
    automationStore.hydrate();
    ensureAutomationEventSubscriptions();
    const existing = automationStore.listWorkflows(organizationId);
    if (existing.length === 0) {
      // Seed an active welcome workflow so event-bus demos work out of the box.
      const seeded = this.createFromTemplate(
        organizationId,
        "tpl_customer_welcome",
      );
      if (seeded) this.setStatus(seeded.id, "active");
    }
  },

  list(organizationId: string): readonly WorkflowDefinition[] {
    return automationStore.listWorkflows(organizationId);
  },

  get(id: string): WorkflowDefinition | undefined {
    return automationStore.getWorkflow(id);
  },

  create(
    input: {
      readonly organizationId: string;
      readonly name: string;
      readonly description?: string;
      readonly createdBy?: string;
      readonly status?: WorkflowStatus;
    },
  ): WorkflowDefinition {
    const workflow: WorkflowDefinition = {
      id: createId("wf"),
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? "",
      status: input.status ?? "draft",
      version: 1,
      nodes: [
        {
          id: "n_trigger",
          kind: "trigger",
          label: "Manual trigger",
          position: { x: 80, y: 120 },
          config: { triggerType: "manual" },
        },
      ],
      edges: [],
      variables: [],
      settings:
        automationStore.getSettings(input.organizationId) ??
        DEFAULT_WORKFLOW_SETTINGS,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    automationStore.upsertWorkflow(workflow);
    return workflow;
  },

  createFromTemplate(
    organizationId: string,
    templateId: string,
    createdBy?: string,
  ): WorkflowDefinition | null {
    const tpl = getWorkflowTemplate(templateId);
    if (!tpl) return null;
    const workflow: WorkflowDefinition = {
      id: createId("wf"),
      organizationId,
      name: tpl.name,
      description: tpl.description,
      status: "draft",
      version: 1,
      nodes: tpl.nodes,
      edges: tpl.edges,
      variables: tpl.variables,
      settings:
        automationStore.getSettings(organizationId) ??
        DEFAULT_WORKFLOW_SETTINGS,
      templateId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy,
    };
    automationStore.upsertWorkflow(workflow);
    return workflow;
  },

  update(workflow: WorkflowDefinition): WorkflowDefinition {
    const next = { ...workflow, updatedAt: nowIso(), version: workflow.version + 1 };
    automationStore.upsertWorkflow(next);
    return next;
  },

  setStatus(id: string, status: WorkflowStatus): WorkflowDefinition | null {
    const wf = automationStore.getWorkflow(id);
    if (!wf) return null;
    const next = { ...wf, status, updatedAt: nowIso() };
    automationStore.upsertWorkflow(next);
    if (status === "disabled") {
      notifyWorkflowEvent(wf.organizationId, "workflow_disabled", {
        title: "Workflow disabled",
        body: `${wf.name} is no longer active.`,
        workflowId: wf.id,
        href: "/dashboard/automation",
      });
    }
    return next;
  },

  remove(id: string): void {
    automationStore.deleteWorkflow(id);
  },

  async runWorkflow(
    workflowId: string,
    opts?: {
      readonly triggeredBy?: TriggerType | "manual" | "retry" | "system";
      readonly payload?: Readonly<Record<string, unknown>>;
    },
  ): Promise<WorkflowExecution | null> {
    const wf = automationStore.getWorkflow(workflowId);
    if (!wf) return null;
    if (wf.status === "disabled" || wf.status === "archived") {
      return null;
    }
    const execution = await engine.enqueue({
      workflow: wf,
      triggeredBy: opts?.triggeredBy ?? "manual",
      payload: opts?.payload,
    });

    if (execution.status === "succeeded") {
      notifyWorkflowEvent(wf.organizationId, "workflow_completed", {
        title: "Workflow completed",
        body: `${wf.name} finished successfully.`,
        workflowId: wf.id,
        executionId: execution.id,
        href: "/dashboard/automation#workflow-history",
      });
    } else if (execution.status === "failed") {
      notifyWorkflowEvent(wf.organizationId, "workflow_failed", {
        title: "Workflow failed",
        body: execution.error ?? `${wf.name} failed.`,
        workflowId: wf.id,
        executionId: execution.id,
        href: "/dashboard/automation#workflow-history",
      });
      notifyWorkflowEvent(wf.organizationId, "execution_error", {
        title: "Execution error",
        body: execution.error ?? "Unknown error",
        workflowId: wf.id,
        executionId: execution.id,
        href: "/dashboard/automation#workflow-history",
      });
    }
    return execution;
  },

  cancelExecution(executionId: string): void {
    engine.cancel(executionId);
  },

  async retryExecution(executionId: string): Promise<WorkflowExecution | null> {
    const prev = automationStore.getExecution(executionId);
    if (!prev) return null;
    return this.runWorkflow(prev.workflowId, {
      triggeredBy: "retry",
      payload: prev.triggerPayload,
    });
  },

  publishModuleEvent(input: {
    readonly type: string;
    readonly organizationId: string;
    readonly source: string;
    readonly payload?: Readonly<Record<string, unknown>>;
  }) {
    ensureAutomationEventSubscriptions();
    return publishDomainEvent({
      type: input.type,
      organizationId: input.organizationId,
      source: input.source,
      payload: input.payload ?? {},
    });
  },

  getSettings(organizationId: string): WorkflowSettings {
    return (
      automationStore.getSettings(organizationId) ?? DEFAULT_WORKFLOW_SETTINGS
    );
  },

  saveSettings(organizationId: string, settings: WorkflowSettings): void {
    automationStore.setSettings(organizationId, settings);
  },
};
