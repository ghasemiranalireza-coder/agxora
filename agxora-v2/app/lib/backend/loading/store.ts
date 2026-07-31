"use client";

type Listener = () => void;

let pending = 0;
let label: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export type LoadingSnapshot = {
  active: boolean;
  count: number;
  label: string | null;
};

export const loadingStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): LoadingSnapshot {
    return {
      active: pending > 0,
      count: pending,
      label,
    };
  },
  start(nextLabel?: string) {
    pending += 1;
    if (nextLabel) label = nextLabel;
    emit();
    return () => loadingStore.stop();
  },
  stop() {
    pending = Math.max(0, pending - 1);
    if (pending === 0) label = null;
    emit();
  },
  reset() {
    pending = 0;
    label = null;
    emit();
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
  let snapshot: T | null = null;
  return {
    apply(optimistic) {
      snapshot = getCurrent();
      setCurrent(optimistic);
    },
    commit(confirmed) {
      setCurrent(confirmed);
      snapshot = null;
    },
    rollback() {
      if (snapshot !== null) {
        setCurrent(snapshot);
        snapshot = null;
      }
    },
  };
}
