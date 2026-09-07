/**
 * Phase 3B — Business Agent LinkedIn adapter.
 * Official LinkedIn UGC Posts API (w_member_social). Never invent an external id.
 */

import "server-only";

import {
  getSocialCredentialSummary,
  getValidSocialAccessTokenForActor,
} from "@/app/lib/social/credentials";
import { isLinkedInPublishEnabled } from "@/app/lib/social/config";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  failedSocial,
  unsupportedSocial,
  type SocialListAccountsResult,
  type SocialProviderAdapter,
  type SocialProviderCapabilities,
  type SocialPublishInput,
  type SocialPublishResult,
} from "./provider";

const LINKEDIN_CAPABILITIES: SocialProviderCapabilities = {
  listAccounts: true,
  publishText: true,
  publishImage: false,
  publishVideo: false,
  schedule: false,
  getPublishStatus: false,
  getInsights: false,
};

const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export type LinkedInCampaignAdapterDeps = {
  readonly getAccessToken: (actor: Actor) => Promise<string | null>;
  readonly getCredentialSummary: (
    organizationId: string,
  ) => ReturnType<typeof getSocialCredentialSummary>;
  readonly fetch: typeof fetch;
};

const defaultDeps: LinkedInCampaignAdapterDeps = {
  getAccessToken: (actor) => getValidSocialAccessTokenForActor(actor, "linkedin"),
  getCredentialSummary: (organizationId) =>
    getSocialCredentialSummary(organizationId, "linkedin"),
  fetch,
};

let depsOverride: LinkedInCampaignAdapterDeps | null = null;

export function setLinkedInCampaignAdapterDepsForTests(
  deps: LinkedInCampaignAdapterDeps | null,
): void {
  depsOverride = deps;
}

function deps(): LinkedInCampaignAdapterDeps {
  return depsOverride ?? defaultDeps;
}

function personUrn(memberId: string): string {
  return memberId.startsWith("urn:li:person:")
    ? memberId
    : `urn:li:person:${memberId}`;
}

function confirmedPostId(response: Response, payload: unknown): string | null {
  const headerId =
    response.headers.get("x-restli-id")?.trim() ||
    response.headers.get("x-linkedin-id")?.trim() ||
    "";
  if (headerId) return headerId;
  if (payload && typeof payload === "object" && "id" in payload) {
    const id = (payload as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return null;
}

function commentaryText(input: SocialPublishInput): string {
  const text = (input.body || input.description || input.title).trim();
  return text;
}

export const linkedinCampaignAdapter: SocialProviderAdapter = {
  providerId: "linkedin",

  getCapabilities() {
    return LINKEDIN_CAPABILITIES;
  },

  async listAccounts(actor): Promise<SocialListAccountsResult> {
    if (!isLinkedInPublishEnabled() && process.env.NODE_ENV !== "test") {
      return failedSocial("linkedin_publish_disabled");
    }
    const token = await deps().getAccessToken(actor);
    if (!token) {
      return failedSocial("linkedin_not_connected");
    }
    const summary = await deps().getCredentialSummary(actor.organizationId);
    if (summary?.externalAccountId) {
      return {
        kind: "ok",
        accounts: [
          {
            externalAccountId: summary.externalAccountId,
            externalAccountName: summary.externalAccountName,
          },
        ],
      };
    }
    const response = await deps().fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return failedSocial("linkedin_userinfo_failed");
    }
    const profile = (await response.json()) as { sub?: string; name?: string };
    if (!profile.sub?.trim()) {
      return failedSocial("linkedin_missing_member_id");
    }
    return {
      kind: "ok",
      accounts: [
        {
          externalAccountId: profile.sub.trim(),
          externalAccountName: profile.name?.trim(),
        },
      ],
    };
  },

  async publishText(input): Promise<SocialPublishResult> {
    if (!isLinkedInPublishEnabled() && process.env.NODE_ENV !== "test") {
      return failedSocial("linkedin_publish_disabled");
    }
    if (input.mediaAssetId) {
      return unsupportedSocial("linkedin_media_not_implemented");
    }
    const text = commentaryText(input);
    if (!text) {
      return failedSocial("linkedin_empty_post");
    }
    const token = await deps().getAccessToken(input.actor);
    if (!token) {
      return failedSocial("linkedin_not_connected");
    }
    const summary = await deps().getCredentialSummary(input.actor.organizationId);
    const memberId = summary?.externalAccountId?.trim();
    if (!memberId) {
      return failedSocial("linkedin_missing_member_id");
    }

    const response = await deps().fetch(UGC_POSTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: personUrn(memberId),
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return failedSocial("linkedin_ugc_post_failed");
    }
    const externalId = confirmedPostId(response, payload);
    if (!externalId) {
      return failedSocial("linkedin_missing_post_id");
    }
    return {
      kind: "ok",
      externalId,
      externalUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}`,
    };
  },

  async publishImage() {
    return unsupportedSocial("linkedin_image_not_implemented");
  },

  async publishVideo() {
    return unsupportedSocial("linkedin_video_not_implemented");
  },

  async schedule() {
    return unsupportedSocial("linkedin_schedule_not_implemented");
  },

  async getPublishStatus() {
    return unsupportedSocial("linkedin_status_not_implemented");
  },

  async getInsights() {
    return unsupportedSocial("linkedin_insights_not_implemented");
  },
};
