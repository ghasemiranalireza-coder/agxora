/**
 * Normalize provider failures at the adapter boundary.
 * Never include tokens, secrets, or raw provider payloads.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";
import { redactSecrets } from "@/app/lib/business-agent/redact";
import type { AdapterExecuteResult, AdapterResultCode } from "./adapter";

function sanitizedMessage(value: string): string {
  const redacted = redactSecrets(value);
  if (typeof redacted !== "string") return "Provider execution failed";
  if (
    /ya29\.|access_token|refresh_token|client_secret|Bearer\s+\S+|sk-[a-zA-Z0-9]/i.test(
      redacted,
    )
  ) {
    return "Provider execution failed";
  }
  return redacted;
}

export function normalizeAdapterError(error: unknown): AdapterExecuteResult {
  if (error instanceof PersistenceError) {
    const message = sanitizedMessage(error.message);
    const details = error.details?.map((entry) => entry.message).join(" ") ?? "";
    const blob = `${error.message} ${details}`.toLowerCase();
    let code: AdapterResultCode = "provider_error";
    if (
      blob.includes("approval_required") ||
      blob.includes("requires explicit approval") ||
      blob.includes("safe mode requires explicit approval")
    ) {
      code = "approval_required";
    } else if (
      blob.includes("not_connected") ||
      blob.includes("not connected")
    ) {
      code = "not_connected";
    } else if (
      blob.includes("reauth") ||
      blob.includes("expired") ||
      blob.includes("revoked") ||
      blob.includes("token_expired")
    ) {
      code = "requires_reauth";
    } else if (
      error.code === "forbidden" ||
      blob.includes("permission") ||
      blob.includes("not granted")
    ) {
      code = "permission_denied";
    } else if (
      error.status === 501 ||
      blob.includes("not_implemented") ||
      blob.includes("not implemented")
    ) {
      code = "not_implemented";
    } else if (error.code === "validation" && error.status !== 502) {
      code = "validation_error";
    } else if (error.code === "unauthorized") {
      code = "permission_denied";
    }
    return {
      ok: false,
      code,
      message,
      status: error.status,
    };
  }
  const fallback =
    error instanceof Error ? sanitizedMessage(error.message) : "Provider execution failed";
  return {
    ok: false,
    code: "provider_error",
    message: fallback,
    status: 502,
  };
}

export function persistenceErrorFromAdapterResult(
  result: AdapterExecuteResult,
): PersistenceError {
  const message = sanitizedMessage(result.message ?? result.code);
  switch (result.code) {
    case "not_implemented":
      return new PersistenceError("validation", message || "Integration not implemented yet", {
        status: result.status ?? 501,
      });
    case "permission_denied":
    case "denied":
      return new PersistenceError("forbidden", message || "Permission denied", {
        status: result.status ?? 403,
      });
    case "approval_required":
      return new PersistenceError("forbidden", message || "Approval required", {
        status: result.status ?? 403,
      });
    case "not_connected":
      return new PersistenceError(
        "forbidden",
        message || "Provider is not connected",
        { status: result.status ?? 401 },
      );
    case "requires_reauth":
      return new PersistenceError(
        "forbidden",
        message || "Provider credentials expired or revoked",
        { status: result.status ?? 401 },
      );
    case "validation_error":
      return new PersistenceError("validation", message || "Invalid request", {
        status: result.status ?? 400,
      });
    case "provider_error":
      return new PersistenceError("validation", message || "Provider request failed", {
        status: result.status ?? 502,
      });
    default:
      return new PersistenceError("persistence", message || "Provider execution failed", {
        status: result.status ?? 500,
      });
  }
}

export function adapterHealthFromConnection(input: {
  readonly connected: boolean;
  readonly connectionStatus: string;
}): { readonly ok: boolean; readonly message: string; readonly code: AdapterResultCode } {
  if (input.connected && input.connectionStatus === "connected") {
    return { ok: true, message: "healthy", code: "ok" };
  }
  if (input.connectionStatus === "requires_reauth") {
    return { ok: false, message: "requires_reauth", code: "requires_reauth" };
  }
  if (input.connectionStatus === "error") {
    return { ok: false, message: "error", code: "provider_error" };
  }
  if (input.connectionStatus === "not_connected" || !input.connected) {
    return { ok: false, message: "not_connected", code: "not_connected" };
  }
  return {
    ok: false,
    message: input.connectionStatus,
    code: "provider_error",
  };
}
