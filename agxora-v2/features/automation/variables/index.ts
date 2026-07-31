/**
 * Variable engine — global, workflow, runtime, and output scopes.
 */

import type { VariableScope, WorkflowVariable } from "../types";

export interface VariableStore {
  readonly global: Record<string, unknown>;
  readonly workflow: Record<string, unknown>;
  readonly runtime: Record<string, unknown>;
  readonly output: Record<string, unknown>;
}

export function createVariableStore(
  seed?: readonly WorkflowVariable[],
): VariableStore {
  const store: VariableStore = {
    global: {},
    workflow: {},
    runtime: {},
    output: {},
  };
  for (const v of seed ?? []) {
    store[v.scope][v.key] = v.value;
  }
  return store;
}

export function setVariable(
  store: VariableStore,
  scope: VariableScope,
  key: string,
  value: unknown,
): void {
  store[scope][key] = value;
}

export function getVariable(
  store: VariableStore,
  key: string,
  preferredScope?: VariableScope,
): unknown {
  if (preferredScope) return store[preferredScope][key];
  if (key in store.runtime) return store.runtime[key];
  if (key in store.output) return store.output[key];
  if (key in store.workflow) return store.workflow[key];
  return store.global[key];
}

/** Flatten scopes for condition / template resolution (runtime wins). */
export function flattenVariables(
  store: VariableStore,
): Record<string, unknown> {
  return {
    ...store.global,
    ...store.workflow,
    ...store.output,
    ...store.runtime,
  };
}

/** Simple {{var}} interpolation. */
export function interpolate(
  template: string,
  store: VariableStore,
): string {
  const flat = flattenVariables(store);
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const parts = path.split(".");
    let cur: unknown = flat;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return "";
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur == null ? "" : String(cur);
  });
}
