/**
 * Automation commercial store — repository-backed, UI-agnostic.
 */

import {
  emptyAutomationState,
  LocalAutomationRepository,
  type AutomationPersistedState,
  type AutomationRepository,
} from "../repositories";
import type {
  AutomationNotification,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowSettings,
} from "../types";

type Listener = () => void;

const listeners = new Set<Listener>();

let repository: AutomationRepository = new LocalAutomationRepository();

let state: AutomationPersistedState & { hydrated: boolean } = {
  ...emptyAutomationState(),
  hydrated: false,
};

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  const { hydrated: _h, ...payload } = state;
  void _h;
  repository.save(payload);
}

export function setAutomationRepository(repo: AutomationRepository): void {
  repository = repo;
}

export const automationStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): AutomationPersistedState & { hydrated: boolean } {
    return state;
  },

  hydrate(): void {
    if (state.hydrated) return;
    const loaded = repository.load();
    state = {
      ...(loaded ?? emptyAutomationState()),
      hydrated: true,
    };
    emit();
  },

  listWorkflows(organizationId: string): readonly WorkflowDefinition[] {
    return state.workflows.filter((w) => w.organizationId === organizationId);
  },

  getWorkflow(id: string): WorkflowDefinition | undefined {
    return state.workflows.find((w) => w.id === id);
  },

  upsertWorkflow(workflow: WorkflowDefinition): void {
    const idx = state.workflows.findIndex((w) => w.id === workflow.id);
    const workflows = [...state.workflows];
    if (idx >= 0) workflows[idx] = workflow;
    else workflows.unshift(workflow);
    state = { ...state, workflows };
    persist();
    emit();
  },

  deleteWorkflow(id: string): void {
    state = {
      ...state,
      workflows: state.workflows.filter((w) => w.id !== id),
    };
    persist();
    emit();
  },

  listExecutions(
    organizationId: string,
    workflowId?: string,
  ): readonly WorkflowExecution[] {
    return state.executions.filter(
      (e) =>
        e.organizationId === organizationId &&
        (!workflowId || e.workflowId === workflowId),
    );
  },

  getExecution(id: string): WorkflowExecution | undefined {
    return state.executions.find((e) => e.id === id);
  },

  upsertExecution(execution: WorkflowExecution): void {
    const idx = state.executions.findIndex((e) => e.id === execution.id);
    const executions = [...state.executions];
    if (idx >= 0) executions[idx] = execution;
    else executions.unshift(execution);
    // Cap history
    if (executions.length > 200) executions.length = 200;
    state = { ...state, executions };
    persist();
    emit();
  },

  pushNotification(n: Omit<AutomationNotification, "id" | "read" | "createdAt"> & {
    readonly id?: string;
  }): AutomationNotification {
    const notification: AutomationNotification = {
      id:
        n.id ??
        `an_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId: n.organizationId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      workflowId: n.workflowId,
      executionId: n.executionId,
      href: n.href,
      read: false,
      createdAt: new Date().toISOString(),
    };
    state = {
      ...state,
      notifications: [notification, ...state.notifications].slice(0, 100),
    };
    persist();
    emit();
    return notification;
  },

  listNotifications(organizationId: string): readonly AutomationNotification[] {
    return state.notifications.filter((n) => n.organizationId === organizationId);
  },

  markNotificationRead(id: string): void {
    state = {
      ...state,
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    };
    persist();
    emit();
  },

  getSettings(organizationId: string): WorkflowSettings | undefined {
    return state.orgSettings[organizationId];
  },

  setSettings(organizationId: string, settings: WorkflowSettings): void {
    state = {
      ...state,
      orgSettings: { ...state.orgSettings, [organizationId]: settings },
    };
    persist();
    emit();
  },
};
