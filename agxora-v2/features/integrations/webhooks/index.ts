/**
 * Webhook engine — incoming / outgoing, retries, signing & secret placeholders.
 */

import type {
  EncryptedCredentialRef,
  RetryPolicy,
  WebhookDelivery,
  WebhookEndpoint,
} from "../types";
import { DEFAULT_RETRY_POLICY } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Placeholder HMAC signing — replace with real crypto on backend. */
export function signWebhookPayloadPlaceholder(
  payload: string,
  secretVaultRef: string,
): string {
  let hash = 0;
  const input = `${secretVaultRef}:${payload}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return `sha256_placeholder_${Math.abs(hash).toString(16)}`;
}

export function createWebhookSecretRef(): EncryptedCredentialRef {
  return {
    id: createId("cred"),
    vaultRef: `vault_whsec_${createId("s").slice(-8)}`,
    kind: "webhook_secret",
    createdAt: nowIso(),
  };
}

export async function deliverOutgoingWebhook(input: {
  readonly endpoint: WebhookEndpoint;
  readonly organizationId: string;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly retryPolicy?: RetryPolicy;
  readonly attempt?: number;
}): Promise<WebhookDelivery> {
  const policy = input.retryPolicy ?? DEFAULT_RETRY_POLICY;
  const attempt = input.attempt ?? 1;
  const payloadStr = JSON.stringify(input.payload);
  const signature = input.endpoint.secretRef
    ? signWebhookPayloadPlaceholder(
        payloadStr,
        input.endpoint.secretRef.vaultRef,
      )
    : undefined;

  void signature;

  // Simulated delivery — backend replaces with HTTP client
  const ok = input.endpoint.enabled && Boolean(input.endpoint.url);
  if (!ok && attempt < policy.maxAttempts) {
    return {
      id: createId("whd"),
      endpointId: input.endpoint.id,
      organizationId: input.organizationId,
      direction: "outgoing",
      eventType: input.eventType,
      status: "retrying",
      attempt,
      maxAttempts: policy.maxAttempts,
      payloadPreview: payloadStr.slice(0, 180),
      error: "Endpoint disabled or missing URL",
      createdAt: nowIso(),
    };
  }

  return {
    id: createId("whd"),
    endpointId: input.endpoint.id,
    organizationId: input.organizationId,
    direction: "outgoing",
    eventType: input.eventType,
    status: ok ? "delivered" : "failed",
    attempt,
    maxAttempts: policy.maxAttempts,
    payloadPreview: payloadStr.slice(0, 180),
    responseCode: ok ? 200 : 503,
    error: ok ? undefined : "Delivery failed",
    createdAt: nowIso(),
    completedAt: nowIso(),
  };
}

export function receiveIncomingWebhook(input: {
  readonly endpoint: WebhookEndpoint;
  readonly organizationId: string;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly signatureHeader?: string;
}): WebhookDelivery {
  const payloadStr = JSON.stringify(input.payload);
  let status: WebhookDelivery["status"] = "delivered";
  let error: string | undefined;

  if (input.endpoint.secretRef && input.signatureHeader) {
    const expected = signWebhookPayloadPlaceholder(
      payloadStr,
      input.endpoint.secretRef.vaultRef,
    );
    if (expected !== input.signatureHeader) {
      status = "signed_pending";
      error = "Signature verification placeholder mismatch";
    }
  }

  return {
    id: createId("whd"),
    endpointId: input.endpoint.id,
    organizationId: input.organizationId,
    direction: "incoming",
    eventType: input.eventType,
    status,
    attempt: 1,
    maxAttempts: 1,
    payloadPreview: payloadStr.slice(0, 180),
    responseCode: status === "delivered" ? 200 : 401,
    error,
    createdAt: nowIso(),
    completedAt: nowIso(),
  };
}
