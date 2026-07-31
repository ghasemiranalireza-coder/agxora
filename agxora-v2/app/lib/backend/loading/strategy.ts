/**
 * Loading strategy helpers — skeletons, optimistic updates, background refresh.
 */

import { loadingStore, createOptimisticController } from "./store";
import {
  idleAsyncState,
  loadingAsyncState,
  successAsyncState,
  errorAsyncState,
  type AsyncState,
} from "./async-state";
import { friendlyErrorMessage } from "../errors/normalize";

export async function withGlobalLoading<T>(
  label: string,
  work: () => Promise<T>,
): Promise<T> {
  loadingStore.start(label);
  try {
    return await work();
  } finally {
    loadingStore.stop();
  }
}

export async function runAsyncState<T>(
  work: () => Promise<T>,
): Promise<AsyncState<T>> {
  try {
    const data = await work();
    return successAsyncState(data);
  } catch (error) {
    return errorAsyncState(friendlyErrorMessage(error));
  }
}

export function beginOptimistic<T>(
  getCurrent: () => T,
  setCurrent: (value: T) => void,
) {
  return createOptimisticController(getCurrent, setCurrent);
}

/** Background refresh placeholder — schedules work without blocking UI. */
export function scheduleBackgroundRefresh(
  label: string,
  work: () => Promise<void>,
): void {
  void (async () => {
    loadingStore.start(`bg:${label}`);
    try {
      await work();
    } catch {
      // background failures stay silent; observability can subscribe later
    } finally {
      loadingStore.stop();
    }
  })();
}

export {
  idleAsyncState,
  loadingAsyncState,
  successAsyncState,
  errorAsyncState,
};
