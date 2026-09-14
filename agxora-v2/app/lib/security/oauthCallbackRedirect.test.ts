import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  GMAIL_OAUTH_FALLBACK_PATH,
  YOUTUBE_OAUTH_FALLBACK_PATH,
} from "./safeInternalPath";

const actorMocks = vi.hoisted(() => ({
  actor: null as Actor | null,
}));

const oauthMocks = vi.hoisted(() => ({
  youtubeRedirect: undefined as string | undefined,
  gmailRedirect: undefined as string | undefined,
}));

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => {
      if (!actorMocks.actor) {
        throw new actual.PersistenceError(
          "unauthorized",
          "Authentication required",
        );
      }
      return actorMocks.actor;
    }),
  };
});

vi.mock("@/app/lib/social/oauth/youtube", () => ({
  completeYouTubeOAuthForActor: vi.fn(async () => ({
    connected: true,
    redirectPath: oauthMocks.youtubeRedirect,
  })),
}));

vi.mock("@/app/lib/social/oauth/gmail", () => ({
  completeGmailOAuthForActor: vi.fn(async () => ({
    connected: true,
    redirectPath: oauthMocks.gmailRedirect,
  })),
}));

vi.mock("@/app/lib/business-agent/integrations", () => ({
  markIntegrationConnectedForActor: vi.fn(async () => undefined),
}));

vi.mock("@/app/lib/auth/server/http", () => ({
  requireDatabase: vi.fn(() => undefined),
}));

import { GET as youtubeCallback } from "@/app/api/v1/agents/social/youtube/callback/route";
import { GET as gmailCallback } from "@/app/api/v1/integrations/email_gmail/callback/route";

const actor: Actor = {
  userId: "user-oauth",
  email: "owner-a@agxora.dev",
  name: "Owner A",
  organizationId: "org-actor",
  workspaceId: "ws-actor",
  membershipId: "mem-actor",
  role: "OWNER",
  sessionToken: "test-session",
};

const ORIGIN = "https://app.agxora.test";

function locationOf(response: Response): string {
  return response.headers.get("location") ?? "";
}

describe("OAuth callback redirect allowlist", () => {
  beforeEach(() => {
    actorMocks.actor = actor;
    oauthMocks.youtubeRedirect = undefined;
    oauthMocks.gmailRedirect = undefined;
  });

  it("YouTube keeps valid relative paths on the same origin", async () => {
    oauthMocks.youtubeRedirect = "/dashboard/social";
    const response = await youtubeCallback(
      new Request(`${ORIGIN}/api/v1/agents/social/youtube/callback?code=c&state=s`),
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = locationOf(response);
    expect(location.startsWith(`${ORIGIN}/dashboard/social`)).toBe(true);
    expect(new URL(location).searchParams.get("youtube")).toBe("connected");
  });

  it("YouTube rejects open redirects and uses the internal fallback", async () => {
    for (const evil of [
      "https://evil.example",
      "//evil.example",
      "http://evil.example",
      "javascript:alert(1)",
    ]) {
      oauthMocks.youtubeRedirect = evil;
      const response = await youtubeCallback(
        new Request(
          `${ORIGIN}/api/v1/agents/social/youtube/callback?code=c&state=s`,
        ),
      );
      const location = locationOf(response);
      expect(location).toContain(ORIGIN);
      expect(location).not.toContain("evil.example");
      expect(location).not.toContain("javascript:");
      expect(new URL(location).pathname).toBe(
        YOUTUBE_OAUTH_FALLBACK_PATH.split("?")[0],
      );
    }
  });

  it("Gmail keeps valid relative paths on the same origin", async () => {
    oauthMocks.gmailRedirect = "/dashboard/integrations";
    const response = await gmailCallback(
      new Request(
        `${ORIGIN}/api/v1/integrations/email_gmail/callback?code=c&state=s`,
      ),
    );
    const location = locationOf(response);
    expect(location.startsWith(`${ORIGIN}${GMAIL_OAUTH_FALLBACK_PATH}`)).toBe(
      true,
    );
    expect(new URL(location).searchParams.get("gmail")).toBe("connected");
  });

  it("Gmail rejects open redirects and uses the internal fallback", async () => {
    oauthMocks.gmailRedirect = "https://evil.example/phish";
    const response = await gmailCallback(
      new Request(
        `${ORIGIN}/api/v1/integrations/email_gmail/callback?code=c&state=s`,
      ),
    );
    const location = locationOf(response);
    expect(location.startsWith(`${ORIGIN}${GMAIL_OAUTH_FALLBACK_PATH}`)).toBe(
      true,
    );
    expect(location).not.toContain("evil.example");
  });
});
