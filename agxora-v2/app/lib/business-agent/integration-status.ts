/**
 * Visual integration status for the Connected Accounts UI.
 * Never maps unsupported providers to connected.
 */

export type IntegrationVisualStatus =
  | "connected"
  | "available"
  | "requires_authorization"
  | "requires_permission"
  | "unsupported";

export function integrationVisualStatus(item: {
  readonly connected: boolean;
  readonly implementationStatus: "oauth_ready" | "not_implemented";
  readonly canPublish?: boolean;
  readonly canSendEmail?: boolean;
  readonly category?: "email" | "social";
}): IntegrationVisualStatus {
  if (item.implementationStatus === "not_implemented") {
    return "unsupported";
  }
  if (!item.connected) {
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
  readonly implementationStatus: "oauth_ready" | "not_implemented";
}): boolean {
  return item.implementationStatus === "oauth_ready" && !item.connected;
}

export function integrationStatusTone(
  status: IntegrationVisualStatus,
): "positive" | "accent" | "warning" | "gold" | "default" {
  switch (status) {
    case "connected":
      return "positive";
    case "available":
      return "gold";
    case "requires_authorization":
      return "accent";
    case "requires_permission":
      return "warning";
    case "unsupported":
    default:
      return "default";
  }
}
