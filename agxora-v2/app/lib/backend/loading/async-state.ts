/**
 * Async state machine helpers for loading / success / error UI.
 */

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type AsyncState<T, E = string> =
  | { readonly status: "idle"; readonly data: null; readonly error: null }
  | { readonly status: "loading"; readonly data: T | null; readonly error: null }
  | { readonly status: "success"; readonly data: T; readonly error: null }
  | { readonly status: "error"; readonly data: T | null; readonly error: E };

export function idleAsyncState<T, E = string>(): AsyncState<T, E> {
  return { status: "idle", data: null, error: null };
}

export function loadingAsyncState<T, E = string>(
  data: T | null = null,
): AsyncState<T, E> {
  return { status: "loading", data, error: null };
}

export function successAsyncState<T, E = string>(data: T): AsyncState<T, E> {
  return { status: "success", data, error: null };
}

export function errorAsyncState<T, E = string>(
  error: E,
  data: T | null = null,
): AsyncState<T, E> {
  return { status: "error", data, error };
}
