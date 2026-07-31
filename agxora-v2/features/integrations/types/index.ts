/**
 * AGXORA Integration Platform — public domain types (Phase 26).
 * Provider-based, backend-ready, UI-independent.
 */

export type ConnectorId =
  | "microsoft365"
  | "google_workspace"
  | "slack"
  | "discord"
  | "dropbox"
  | "onedrive"
  | "google_drive"
  | "hubspot"
  | "salesforce"
  | "zapier"
  | "make"
  | "github"
  | "gitlab"
  | "custom";

export type ConnectorCategory =
  | "productivity"
  | "communication"
  | "storage"
  | "crm"
  | "automation"
  | "devtools"
  | "custom";

export type ConnectionStatus =
  | "available"
  | "installed"
  | "connected"
  | "error"
  | "disabled"
  | "pending_auth";

export type AuthMethod = "oauth2" | "api_key" | "webhook" | "none";

export type ApiProtocol = "rest" | "graphql" | "websocket" | "webhook" | "grpc";

export type WebhookDirection = "incoming" | "outgoing";

export type WebhookDeliveryStatus =
  | "queued"
  | "delivered"
  | "failed"
  | "retrying"
  | "signed_pending";

export type SyncMode = "one_way" | "two_way" | "manual" | "scheduled";

export type SyncStatus =
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "conflict";

export type ApiKeyStatus = "active" | "rotated" | "revoked" | "expired";

export type OAuthProviderId =
  | "google"
  | "microsoft"
  | "github"
  | "slack"
  | "dropbox"
  | "custom";

export type IntegrationLogLevel = "error" | "warn" | "info" | "debug";

export type IntegrationPermissionScope =
  | "integrations.read"
  | "integrations.write"
  | "integrations.connect"
  | "integrations.admin"
  | "api_keys.manage"
  | "webhooks.manage";

export interface ConnectorDefinition {
  readonly id: ConnectorId;
  readonly name: string;
  readonly description: string;
  readonly category: ConnectorCategory;
  readonly authMethod: AuthMethod;
  readonly oauthProvider?: OAuthProviderId;
  readonly protocols: readonly ApiProtocol[];
  readonly eventTypes: readonly string[];
  readonly scopes: readonly string[];
  readonly docsUrl?: string;
}

export interface EncryptedCredentialRef {
  readonly id: string;
  /** Opaque handle — never expose raw secrets to UI. */
  readonly vaultRef: string;
  readonly kind: "oauth_token" | "api_secret" | "webhook_secret" | "custom";
  readonly createdAt: string;
  readonly expiresAt?: string;
}

export interface IntegrationConnection {
  readonly id: string;
  readonly organizationId: string;
  readonly connectorId: ConnectorId;
  readonly status: ConnectionStatus;
  readonly displayName: string;
  readonly credentialRef?: EncryptedCredentialRef;
  readonly scopes: readonly string[];
  readonly health: ConnectionHealth;
  readonly installedAt: string;
  readonly connectedAt?: string;
  readonly lastError?: string;
  readonly config: Readonly<Record<string, unknown>>;
}

export interface ConnectionHealth {
  readonly status: "healthy" | "degraded" | "down" | "unknown";
  readonly lastCheckedAt: string;
  readonly latencyMs?: number;
  readonly message?: string;
}

export interface OAuthAuthorizationRequest {
  readonly providerId: OAuthProviderId;
  readonly connectorId: ConnectorId;
  readonly organizationId: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
  readonly state: string;
  readonly codeChallenge?: string;
}

export interface OAuthAuthorizationResult {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly placeholder: true;
}

export interface ApiGatewayRoute {
  readonly id: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "*";
  readonly path: string;
  readonly protocol: ApiProtocol;
  readonly description: string;
  readonly enabled: boolean;
}

export interface ApiGatewayRequest {
  readonly id: string;
  readonly organizationId: string;
  readonly routeId: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly at: string;
  readonly apiKeyId?: string;
}

export interface WebhookEndpoint {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly direction: WebhookDirection;
  readonly url: string;
  readonly secretRef?: EncryptedCredentialRef;
  readonly enabled: boolean;
  readonly events: readonly string[];
  readonly connectorId?: ConnectorId;
  readonly createdAt: string;
}

export interface WebhookDelivery {
  readonly id: string;
  readonly endpointId: string;
  readonly organizationId: string;
  readonly direction: WebhookDirection;
  readonly eventType: string;
  readonly status: WebhookDeliveryStatus;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly payloadPreview: string;
  readonly responseCode?: number;
  readonly error?: string;
  readonly createdAt: string;
  readonly completedAt?: string;
}

export interface ApiKeyRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly prefix: string;
  /** Only available at creation time — never persisted in cleartext. */
  readonly secretOnce?: string;
  readonly scopes: readonly string[];
  readonly status: ApiKeyStatus;
  readonly usageCount: number;
  readonly createdAt: string;
  readonly lastUsedAt?: string;
  readonly expiresAt?: string;
  readonly rotatedFromId?: string;
}

export interface FieldMappingRule {
  readonly id: string;
  readonly sourceField: string;
  readonly targetField: string;
  readonly transform?:
    | "none"
    | "uppercase"
    | "lowercase"
    | "trim"
    | "default"
    | "custom";
  readonly defaultValue?: unknown;
  readonly required?: boolean;
  readonly customScriptPlaceholder?: string;
}

export interface DataMappingProfile {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly connectorId: ConnectorId;
  readonly rules: readonly FieldMappingRule[];
  readonly updatedAt: string;
}

export interface SyncJob {
  readonly id: string;
  readonly organizationId: string;
  readonly connectionId: string;
  readonly mode: SyncMode;
  readonly status: SyncStatus;
  readonly mappingProfileId?: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly recordsProcessed: number;
  readonly conflicts: number;
  readonly error?: string;
  readonly scheduleCron?: string;
}

export interface IntegrationLogEntry {
  readonly id: string;
  readonly organizationId: string;
  readonly level: IntegrationLogLevel;
  readonly source: string;
  readonly message: string;
  readonly connectionId?: string;
  readonly webhookId?: string;
  readonly at: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface IntegrationMetrics {
  readonly connectedCount: number;
  readonly availableCount: number;
  readonly errorCount: number;
  readonly apiRequests24h: number;
  readonly webhookDeliveries24h: number;
  readonly webhookFailures24h: number;
  readonly syncJobs24h: number;
  readonly syncConflicts24h: number;
}

export interface DeveloperSettings {
  readonly organizationId: string;
  readonly sandboxMode: boolean;
  readonly webhookSigningEnabled: boolean;
  readonly defaultRetryAttempts: number;
  readonly apiDocsUrl: string;
  readonly sdkPlaceholderUrl: string;
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
};

export const DEFAULT_DEVELOPER_SETTINGS: Omit<
  DeveloperSettings,
  "organizationId"
> = {
  sandboxMode: true,
  webhookSigningEnabled: true,
  defaultRetryAttempts: 3,
  apiDocsUrl: "/dashboard/integrations#developer",
  sdkPlaceholderUrl: "https://docs.agxora.local/sdk",
};
