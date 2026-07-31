"use client";

type Listener = () => void;

export type LoadingSnapshot = {
  readonly active: boolean;
  readonly count: number;
  readonly label: string | null;
};

let pending = 0;
let label: string | null = null;
const listeners = new Set<Listener>();

/** Cached snapshot — must keep referential equality between emits. */
let snapshot: LoadingSnapshot = {
  active: false,
  count: 0,
  label: null,
};

function emit() {
  listeners.forEach((l) => l());
}

function refreshSnapshot(): boolean {
  const nextActive = pending > 0;
  const nextLabel = nextActive ? label : null;
  if (
    snapshot.active === nextActive &&
    snapshot.count === pending &&
    snapshot.label === nextLabel
  ) {
    return false;
  }
  snapshot = {
    active: nextActive,
    count: pending,
    label: nextLabel,
  };
  return true;
}

export const loadingStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): LoadingSnapshot {
    return snapshot;
  },
  start(nextLabel?: string) {
    pending += 1;
    if (nextLabel) label = nextLabel;
    if (refreshSnapshot()) emit();
    return () => loadingStore.stop();
  },
  stop() {
    pending = Math.max(0, pending - 1);
    if (pending === 0) label = null;
    if (refreshSnapshot()) emit();
  },
  reset() {
    pending = 0;
    label = null;
    if (refreshSnapshot()) emit();
  },
};

/** Architecture helper for optimistic UI updates (apply → commit/rollback). */
export type OptimisticController<T> = {
  apply: (optimistic: T) => void;
  commit: (confirmed: T) => void;
  rollback: () => void;
};

export function createOptimisticController<T>(
  getCurrent: () => T,
  setCurrent: (value: T) => void,
): OptimisticController<T> {
  let previous: T | null = null;
  return {
    apply(optimistic) {
      previous = getCurrent();
      setCurrent(optimistic);
    },
    commit(confirmed) {
      setCurrent(confirmed);
      previous = null;
    },
    rollback() {
      if (previous !== null) {
        setCurrent(previous);
        previous = null;
      }
    },
  };
}
