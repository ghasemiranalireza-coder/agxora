/**
 * Workspace Engine — isolated workspace context for all modules.
 *
 * Composes with the Organization Foundation. Does not own persistence;
 * it projects a universal WorkspaceContext every subsystem can use.
 */

import type { WorkspaceContext, WorkspaceKind } from "../types";

export interface WorkspaceEngineState {
  readonly active: WorkspaceContext;
  readonly available: readonly WorkspaceContext[];
}

export type WorkspaceListener = (state: WorkspaceEngineState) => void;

export interface WorkspaceEngine {
  getContext(): WorkspaceContext;
  getState(): WorkspaceEngineState;
  setActive(context: WorkspaceContext): void;
  setAvailable(workspaces: readonly WorkspaceContext[]): void;
  clear(): void;
  subscribe(listener: WorkspaceListener): () => void;
}

const EMPTY: WorkspaceContext = {
  workspaceId: null,
  organizationId: null,
  kind: null,
  name: null,
  isolated: true,
};

export function createWorkspaceEngine(
  initial?: Partial<WorkspaceContext>,
): WorkspaceEngine {
  let active: WorkspaceContext = {
    ...EMPTY,
    ...initial,
    isolated: true,
  };
  let available: WorkspaceContext[] = active.workspaceId ? [active] : [];
  const listeners = new Set<WorkspaceListener>();

  const emit = (): void => {
    const state = { active, available: [...available] as const };
    for (const listener of [...listeners]) listener(state);
  };

  return {
    getContext() {
      return active;
    },

    getState() {
      return { active, available: [...available] };
    },

    setActive(context) {
      active = { ...context, isolated: true };
      if (
        context.workspaceId &&
        !available.some((w) => w.workspaceId === context.workspaceId)
      ) {
        available = [...available, active];
      }
      emit();
    },

    setAvailable(workspaces) {
      available = workspaces.map((w) => ({ ...w, isolated: true as const }));
      if (
        active.workspaceId &&
        !available.some((w) => w.workspaceId === active.workspaceId)
      ) {
        active = available[0] ?? EMPTY;
      }
      emit();
    },

    clear() {
      active = EMPTY;
      available = [];
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Maps organization form (or future workspace type labels) to a
 * universal WorkspaceKind. Never industry-specific.
 */
export function workspaceKindFromType(
  type: string | null | undefined,
): WorkspaceKind {
  switch (type) {
    case "personal":
    case "freelancer":
      return "personal";
    case "team":
    case "startup":
    case "small_business":
      return "team";
    case "enterprise":
    case "government":
    case "international":
    case "holding":
      return "enterprise";
    case "sandbox":
      return "sandbox";
    default:
      return "organization";
  }
}
