/**
 * Phase 3A — Business Agent social adapter registry.
 * YouTube is the only real publisher. Other providers stay not_implemented.
 * This is not the Agent OS unavailable stub map.
 */

import "server-only";

import type { IntegrationProviderId } from "@/app/lib/business-agent/catalog";
import { createNotImplementedSocialAdapter } from "./notImplementedAdapter";
import type { SocialProviderAdapter } from "./provider";
import { youtubeCampaignAdapter } from "./youtubeCampaignAdapter";

let adapterOverride: SocialProviderAdapter | null = null;

export function setSocialProviderAdapterForTests(
  adapter: SocialProviderAdapter | null,
): void {
  adapterOverride = adapter;
}

export function getSocialProviderAdapter(
  provider: IntegrationProviderId,
): SocialProviderAdapter {
  if (adapterOverride && adapterOverride.providerId === provider) {
    return adapterOverride;
  }
  if (provider === "youtube") {
    return youtubeCampaignAdapter;
  }
  return createNotImplementedSocialAdapter(provider);
}
