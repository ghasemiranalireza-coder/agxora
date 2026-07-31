/**
 * API transport contracts.
 */

export interface ApiRequestOptions {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly retry?: boolean;
  readonly authToken?: string | null;
}

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly status: number;
}

export interface ApiFailure {
  readonly ok: false;
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface OptimisticUpdate<T> {
  readonly id: string;
  readonly previous: T | null;
  readonly next: T;
  readonly commit: () => Promise<void>;
  readonly rollback: () => void;
}
