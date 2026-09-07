/**
 * Honest unavailable adapter for social providers that are not implemented.
 * Do not use this as a fake publisher.
 */

import "server-only";

import type { IntegrationProviderId } from "@/app/lib/business-agent/catalog";
import {
  failedSocial,
  unsupportedSocial,
  type SocialListAccountsResult,
  type SocialProviderAdapter,
  type SocialProviderCapabilities,
  type SocialPublishResult,
} from "./provider";

const EMPTY_CAPABILITIES: SocialProviderCapabilities = {
  listAccounts: false,
  publishText: false,
  publishImage: false,
  publishVideo: false,
  schedule: false,
  getPublishStatus: false,
  getInsights: false,
};

export function createNotImplementedSocialAdapter(
  providerId: IntegrationProviderId,
): SocialProviderAdapter {
  const reason = `${providerId}_not_implemented`;
  return {
    providerId,
    getCapabilities() {
      return EMPTY_CAPABILITIES;
    },
    async listAccounts(): Promise<SocialListAccountsResult> {
      return failedSocial(reason);
    },
    async publishText(): Promise<SocialPublishResult> {
      return failedSocial(reason);
    },
    async publishImage(): Promise<SocialPublishResult> {
      return failedSocial(reason);
    },
    async publishVideo(): Promise<SocialPublishResult> {
      return failedSocial(reason);
    },
    async schedule(): Promise<SocialPublishResult> {
      return unsupportedSocial(reason);
    },
    async getPublishStatus(): Promise<SocialPublishResult> {
      return unsupportedSocial(reason);
    },
    async getInsights(): Promise<SocialPublishResult> {
      return unsupportedSocial(reason);
    },
  };
}
