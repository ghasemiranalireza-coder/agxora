/**
 * Campaign channel rules. Unsupported providers never look connected or executable.
 */

import { getCatalogEntry, type IntegrationProviderId } from "./catalog";

export function isExecutableCampaignProvider(
  provider: IntegrationProviderId,
): boolean {
  return getCatalogEntry(provider).implementationStatus === "oauth_ready";
}

export function unsupportedCampaignProviderMessage(
  provider: IntegrationProviderId,
): string {
  const catalog = getCatalogEntry(provider);
  return `${catalog.label} is not available in AGXORA yet. Nothing was created or published.`;
}

export function firstUnsupportedCampaignProvider(
  items: readonly { readonly provider: IntegrationProviderId }[],
): IntegrationProviderId | null {
  const unsupported = items.find(
    (item) => !isExecutableCampaignProvider(item.provider),
  );
  return unsupported?.provider ?? null;
}

export function supportedCampaignChannels(
  channels: readonly IntegrationProviderId[],
): IntegrationProviderId[] {
  return [...new Set(channels.filter(isExecutableCampaignProvider))];
}
