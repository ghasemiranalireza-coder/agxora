import type { SocialAdapterResult, SocialContentItem } from "./types";

export interface SocialPlatformAdapter {
  readonly platformId: string;
  createPost(item: SocialContentItem): Promise<SocialAdapterResult>;
  createStory(item: SocialContentItem): Promise<SocialAdapterResult>;
  schedulePost(item: SocialContentItem): Promise<SocialAdapterResult>;
  publishPost(item: SocialContentItem): Promise<SocialAdapterResult>;
  publishStory(item: SocialContentItem): Promise<SocialAdapterResult>;
  getAnalytics(): Promise<SocialAdapterResult>;
}

function unavailable(action: string): SocialAdapterResult {
  return {
    available: false,
    status: "unavailable",
    published: false,
    reason: `${action}_unavailable`,
  };
}

export function createUnavailableSocialAdapter(
  platformId: string,
): SocialPlatformAdapter {
  return {
    platformId,
    async createPost() {
      return unavailable("createPost");
    },
    async createStory() {
      return unavailable("createStory");
    },
    async schedulePost() {
      return unavailable("schedulePost");
    },
    async publishPost() {
      return unavailable("publishPost");
    },
    async publishStory() {
      return unavailable("publishStory");
    },
    async getAnalytics() {
      return unavailable("getAnalytics");
    },
  };
}

const adapters = new Map<string, SocialPlatformAdapter>(
  ["instagram", "facebook", "tiktok", "linkedin", "youtube"].map((id) => [
    id,
    createUnavailableSocialAdapter(id),
  ]),
);

export function getSocialAdapter(platformId: string): SocialPlatformAdapter {
  return adapters.get(platformId) ?? createUnavailableSocialAdapter(platformId);
}

export function setSocialAdapter(adapter: SocialPlatformAdapter): void {
  adapters.set(adapter.platformId, adapter);
}
