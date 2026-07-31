export type AppErrorCode =
  | "NOT_FOUND"
  | "INTERNAL"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "OFFLINE"
  | "VALIDATION"
  | "TIMEOUT"
  | "UNKNOWN";

export type AppErrorShape = {
  code: AppErrorCode;
  title: string;
  message: string;
  status?: number;
  retryable: boolean;
};

export const APP_ERRORS: Record<AppErrorCode, AppErrorShape> = {
  NOT_FOUND: {
    code: "NOT_FOUND",
    title: "Page not found",
    message: "The resource you requested does not exist.",
    status: 404,
    retryable: false,
  },
  INTERNAL: {
    code: "INTERNAL",
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    status: 500,
    retryable: true,
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    title: "Sign in required",
    message: "You need to authenticate to continue.",
    status: 401,
    retryable: false,
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    title: "Access denied",
    message: "You do not have permission to view this content.",
    status: 403,
    retryable: false,
  },
  OFFLINE: {
    code: "OFFLINE",
    title: "You are offline",
    message: "Check your connection and retry when back online.",
    status: 0,
    retryable: true,
  },
  VALIDATION: {
    code: "VALIDATION",
    title: "Invalid request",
    message: "Please check your input and try again.",
    status: 400,
    retryable: false,
  },
  TIMEOUT: {
    code: "TIMEOUT",
    title: "Request timed out",
    message: "The server took too long to respond.",
    status: 408,
    retryable: true,
  },
  UNKNOWN: {
    code: "UNKNOWN",
    title: "Unexpected error",
    message: "An unknown error occurred.",
    retryable: true,
  },
};

export function resolveAppError(
  code: AppErrorCode,
  overrides?: Partial<AppErrorShape>,
): AppErrorShape {
  return { ...APP_ERRORS[code], ...overrides, code };
}
