/**
 * Automation repository pattern — LocalStorage now, API later.
 */

import type {
  AutomationNotification,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowSettings,
} from "../types";
import { DEFAULT_WORKFLOW_SETTINGS } from "../types";

export interface AutomationPersistedState {
  readonly version: 1;
  readonly workflows: WorkflowDefinition[];
  readonly executions: WorkflowExecution[];
  readonly notifications: AutomationNotification[];
  readonly orgSettings: Record<string, WorkflowSettings>;
}

export interface AutomationRepository {
  load(): AutomationPersistedState | null;
  save(state: AutomationPersistedState): void;
}

const STORAGE_KEY = "agxora-automation-engine-v1";

export class LocalAutomationRepository implements AutomationRepository {
  load(): AutomationPersistedState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AutomationPersistedState;
    } catch {
      return null;
    }
  }

  save(state: AutomationPersistedState): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota / private mode
    }
  }
}

/** Future REST repository — no UI coupling. */
export class RestAutomationRepository implements AutomationRepository {
  constructor(private readonly baseUrl: string) {
    void this.baseUrl;
  }

  load(): AutomationPersistedState | null {
    return null;
  }

  save(state: AutomationPersistedState): void {
    void state;
    // POST/PUT when backend is wired
  }
}

export function emptyAutomationState(): AutomationPersistedState {
  return {
    version: 1,
    workflows: [],
    executions: [],
    notifications: [],
    orgSettings: {},
  };
}

export function getOrgSettings(
  state: AutomationPersistedState,
  organizationId: string,
): WorkflowSettings {
  return state.orgSettings[organizationId] ?? DEFAULT_WORKFLOW_SETTINGS;
}
