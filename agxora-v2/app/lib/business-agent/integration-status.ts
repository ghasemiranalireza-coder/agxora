/**
 * Visual integration status for Connected Accounts / Integration Center.
 * Never maps unsupported providers to connected.
 * Implementation status is separate from connection status.
 */

import type { ProviderImplementationStatus as CanonicalImplementationStatus } from "@/app/lib/integrations/types";
import type { ProviderUiState } from "@/app/lib/integrations/types";

export type IntegrationVisualStatus =
  | "connected"
  | "available"
  | "requires_authorization"
  | "requires_permission"
  | "requires_reauth"
  | "unsupported"
  | "coming_soon"
  | "error";

type ImplementationInput =
  | "oauth_ready"
  | "not_implemented"
  | CanonicalImplementationStatus;

function isImplemented(status: ImplementationInput): boolean {
  return status === "oauth_ready" || status === "available";
}

export function integrationVisualStatus(item: {
  readonly connected: boolean;
  readonly implementationStatus: ImplementationInput;
  readonly canPublish?: boolean;
  readonly canSendEmail?: boolean;
  readonly category?: "email" | "social" | string;
  readonly connectionStatus?: string;
  readonly lastError?: string | null;
}): IntegrationVisualStatus {
  if (!isImplemented(item.implementationStatus)) {
    return item.implementationStatus === "coming_soon" ? "coming_soon" : "unsupported";
  }
  if (!item.connected) {
    if (
      item.connectionStatus === "requires_reauth" ||
      item.connectionStatus === "connected"
    ) {
      return "requires_reauth";
    }
    if (item.connectionStatus === "error" || item.lastError) {
      return /reauth|token|revoked|expired/i.test(item.lastError ?? "")
        ? "requires_reauth"
        : "error";
    }
    return "requires_authorization";
  }
  if (item.category === "email" && item.canSendEmail === false) {
    return "requires_permission";
  }
  if (item.category === "social" && item.canPublish === false) {
    return "requires_permission";
  }
  return "connected";
}

export function isIntegrationConnectable(item: {
  readonly connected: boolean;
  readonly implementationStatus: ImplementationInput;
}): boolean {
  return isImplemented(item.implementationStatus) && !item.connected;
}

export function integrationStatusTone(
  status: IntegrationVisualStatus | ProviderUiState,
): "positive" | "accent" | "warning" | "gold" | "default" | "critical" {
  switch (status) {
    case "connected":
      return "positive";
    case "available":
      return "gold";
    case "requires_authorization":
    case "requires_reauth":
      return "accent";
    case "requires_permission":
    case "coming_soon":
      return "warning";
    case "error":
      return "critical";
    case "unsupported":
    case "upgrade_required":
    default:
      return "default";
  }
}
