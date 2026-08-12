/**
 * Domain-safe persistence / authorization errors — never leak SQL.
 */

export type PersistenceErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "persistence"
  | "misconfigured";

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly status: number;
  readonly details?: readonly { readonly field?: string; readonly message: string }[];

  constructor(
    code: PersistenceErrorCode,
    message: string,
    options?: {
      readonly status?: number;
      readonly details?: readonly { readonly field?: string; readonly message: string }[];
    },
  ) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
    this.status =
      options?.status ??
      ({
        unauthorized: 401,
        forbidden: 403,
        not_found: 404,
        validation: 400,
        conflict: 409,
        persistence: 500,
        misconfigured: 503,
      }[code] as number);
    this.details = options?.details;
  }
}

export function isPersistenceError(error: unknown): error is PersistenceError {
  return error instanceof PersistenceError;
}
