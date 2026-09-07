/**
 * Phase 3A — server-only, provider-agnostic social adapter contract.
 * Never return `ok` for an external publish without a real provider confirmation id.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import type { IntegrationProviderId } from "@/app/lib/business-agent/catalog";

export type SocialProviderOk = {
  readonly kind: "ok";
  readonly externalId: string;
  readonly externalUrl?: string;
};

export type SocialProviderUnsupported = {
  readonly kind: "unsupported";
  readonly reason: string;
};

export type SocialProviderHumanRequired = {
  readonly kind: "human_required";
  readonly reason: string;
};

export type SocialProviderFailed = {
  readonly kind: "failed";
  readonly reason: string;
};

export type SocialPublishResult =
  | SocialProviderOk
  | SocialProviderUnsupported
  | SocialProviderHumanRequired
  | SocialProviderFailed;

export type SocialConnectedAccount = {
  readonly externalAccountId?: string;
  readonly externalAccountName?: string;
};

export type SocialListAccountsResult =
  | {
      readonly kind: "ok";
      readonly accounts: readonly SocialConnectedAccount[];
    }
  | SocialProviderUnsupported
  | SocialProviderHumanRequired
  | SocialProviderFailed;

export type SocialProviderCapabilities = {
  readonly listAccounts: boolean;
  readonly publishText: boolean;
  readonly publishImage: boolean;
  readonly publishVideo: boolean;
  readonly schedule: boolean;
  readonly getPublishStatus: boolean;
  readonly getInsights: boolean;
};

export type SocialPublishInput = {
  readonly actor: Actor;
  readonly campaignItemId: string;
  readonly title: string;
  readonly description: string;
  readonly body?: string;
  readonly mediaAssetId?: string | null;
  readonly contentType: string;
  readonly scheduledAt?: Date | null;
};

export type SocialStatusInput = {
  readonly actor: Actor;
  readonly externalId: string;
};

export interface SocialProviderAdapter {
  readonly providerId: IntegrationProviderId;
  getCapabilities(): SocialProviderCapabilities;
  listAccounts(actor: Actor): Promise<SocialListAccountsResult>;
  publishText(input: SocialPublishInput): Promise<SocialPublishResult>;
  publishImage(input: SocialPublishInput): Promise<SocialPublishResult>;
  publishVideo(input: SocialPublishInput): Promise<SocialPublishResult>;
  schedule(input: SocialPublishInput): Promise<SocialPublishResult>;
  getPublishStatus(input: SocialStatusInput): Promise<SocialPublishResult>;
  getInsights(input: SocialStatusInput): Promise<SocialPublishResult>;
}

export function isConfirmedSocialPublish(
  result: SocialPublishResult,
): result is SocialProviderOk {
  return result.kind === "ok" && result.externalId.trim().length > 0;
}

export function unsupportedSocial(reason: string): SocialProviderUnsupported {
  return { kind: "unsupported", reason };
}

export function failedSocial(reason: string): SocialProviderFailed {
  return { kind: "failed", reason };
}

export function humanRequiredSocial(reason: string): SocialProviderHumanRequired {
  return { kind: "human_required", reason };
}
