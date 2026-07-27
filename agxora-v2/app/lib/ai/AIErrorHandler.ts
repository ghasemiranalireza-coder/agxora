/**
 * Safe AI error handling — never log secrets.
 */

export type AIErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "CONTEXT_TOO_LARGE"
  | "ABORTED"
  | "INVALID_REQUEST"
  | "TOOL_FAILED"
  | "UNKNOWN";

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly providerId?: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(input: {
    code: AIErrorCode;
    message: string;
    providerId?: string;
    retryable?: boolean;
    details?: Readonly<Record<string, unknown>>;
  }) {
    super(input.message);
    this.name = "AIError";
    this.code = input.code;
    this.providerId = input.providerId;
    this.retryable = input.retryable ?? false;
    this.details = sanitizeDetails(input.details);
  }
}

const SECRET_KEY_PATTERN =
  /(api[_-]?key|authorization|token|secret|password|credential)/i;

export function sanitizeDetails(
  details?: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  if (!details) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      clean[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && SECRET_KEY_PATTERN.test(value)) {
      clean[key] = "[redacted]";
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

export function toAIError(error: unknown, providerId?: string): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AIError({
      code: "ABORTED",
      message: "Generation cancelled",
      providerId,
      retryable: false,
    });
  }
  if (error instanceof Error) {
    return new AIError({
      code: "UNKNOWN",
      message: error.message,
      providerId,
      retryable: true,
      details: { name: error.name },
    });
  }
  return new AIError({
    code: "UNKNOWN",
    message: "Unknown AI error",
    providerId,
    retryable: true,
  });
}

/** Safe logger — strips secrets before console output. */
export function logAIError(error: AIError): void {
  const payload = {
    code: error.code,
    message: error.message,
    providerId: error.providerId,
    retryable: error.retryable,
    details: error.details,
  };
  // Architecture only — replace with structured logger later.
  console.error("[agxora.ai]", payload);
}
