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
    title: "backend.notFound.title",
    message: "backend.notFound.message",
    status: 404,
    retryable: false,
  },
  INTERNAL: {
    code: "INTERNAL",
    title: "backend.errorBoundary.title",
    message: "backend.globalError.message",
    status: 500,
    retryable: true,
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    title: "errors.signInRequired",
    message: "errors.codes.AUTH_SIGN_IN_REQUIRED",
    status: 401,
    retryable: false,
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    title: "errors.insufficientPermissions",
    message: "errors.codes.AUTH_INSUFFICIENT_PERMISSIONS",
    status: 403,
    retryable: false,
  },
  OFFLINE: {
    code: "OFFLINE",
    title: "backend.offline.title",
    message: "backend.offline.message",
    status: 0,
    retryable: true,
  },
  VALIDATION: {
    code: "VALIDATION",
    title: "errors.codes.COMMON_VALIDATION",
    message: "errors.codes.COMMON_VALIDATION",
    status: 400,
    retryable: false,
  },
  TIMEOUT: {
    code: "TIMEOUT",
    title: "errors.codes.COMMON_TIMEOUT",
    message: "errors.codes.COMMON_TIMEOUT",
    status: 408,
    retryable: true,
  },
  UNKNOWN: {
    code: "UNKNOWN",
    title: "errors.codes.COMMON_UNKNOWN",
    message: "errors.codes.COMMON_UNKNOWN",
    retryable: true,
  },
};

export function resolveAppError(
  code: AppErrorCode,
  overrides?: Partial<AppErrorShape>,
): AppErrorShape {
  return { ...APP_ERRORS[code], ...overrides, code };
}
