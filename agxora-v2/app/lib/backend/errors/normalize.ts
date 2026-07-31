/**
 * Normalize API / unknown errors into friendly AppErrorShape.
 */

import { ApiClientError } from "../api/client";
import {
  APP_ERRORS,
  resolveAppError,
  type AppErrorCode,
  type AppErrorShape,
} from "./codes";

export function normalizePlatformError(error: unknown): AppErrorShape {
  if (error instanceof ApiClientError) {
    const code = mapStatusToCode(error.status, error.code);
    return resolveAppError(code, {
      message: error.message || APP_ERRORS[code].message,
      status: error.status,
      retryable: error.status >= 500 || error.status === 429 || error.status === 0,
    });
  }
  if (error && typeof error === "object" && "ok" in error) {
    const failure = error as {
      ok: false;
      status: number;
      code: string;
      message: string;
    };
    if (failure.ok === false) {
      const code = mapStatusToCode(failure.status, failure.code);
      return resolveAppError(code, {
        message: failure.message,
        status: failure.status,
        retryable:
          failure.status >= 500 || failure.status === 429 || failure.status === 0,
      });
    }
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return resolveAppError("TIMEOUT", { message: error.message });
    }
    return resolveAppError("UNKNOWN", { message: error.message });
  }
  return resolveAppError("UNKNOWN");
}

function mapStatusToCode(status: number, rawCode: string): AppErrorCode {
  if (status === 401 || rawCode.includes("unauthorized")) return "UNAUTHORIZED";
  if (status === 403 || rawCode.includes("forbidden")) return "FORBIDDEN";
  if (status === 404 || rawCode.includes("not_found")) return "NOT_FOUND";
  if (status === 400 || rawCode.includes("validation")) return "VALIDATION";
  if (status === 408 || rawCode.includes("timeout")) return "TIMEOUT";
  if (status === 0 || rawCode.includes("network") || rawCode.includes("offline")) {
    return "OFFLINE";
  }
  if (status >= 500) return "INTERNAL";
  return "UNKNOWN";
}

export function friendlyErrorMessage(error: unknown): string {
  return normalizePlatformError(error).message;
}
