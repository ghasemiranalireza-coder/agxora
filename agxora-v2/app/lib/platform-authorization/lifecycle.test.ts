import { afterEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  getValidSocialAccessTokenForActor,
  hasActiveSocialCredential,
  setSocialCredentialStoreForTests,
  upsertSocialCredentialForActor,
} from "@/app/lib/social/credentials";
import {
  createMemoryAuthorizationStore,
  finalizePlatformAuthorization,
  listPlatformAuthorizations,
  requireExplicitPlatformGrant,
  revokePlatformAuthorization,
  setAuthorizationStoreForTests,
  setAutomaticPublishingForActor,
} from "./service";

function actor(): Actor {
  return {
    userId: "user-life",
    email: "life@example.com",
    name: "Customer",
    organizationId: "org-life",
    workspaceId: "ws-life",
    membershipId: "mem",
    role: "OWNER",
    sessionToken: "session",
  };
}

const publishGrant = {
  confirmed: true,
  permissions: ["connect_account", "read_content", "create_content", "publish_posts"],
  aiContent: false,
  automaticPublishing: false,
  accountLabel: "Channel",
};

describe("platform authorization lifecycle", () => {
  afterEach(() => {
    setAuthorizationStoreForTests(null);
    setSocialCredentialStoreForTests(null);
    vi.unstubAllGlobals();
    delete process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID;
    delete process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET;
    delete process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI;
  });

  it("blocks automatic publishing when the grant is missing, expired, or revoked", async () => {
    setAuthorizationStoreForTests(createMemoryAuthorizationStore());
    const customer = actor();

    await expect(
      setAutomaticPublishingForActor(customer, "youtube", { enabled: true, confirmed: true }),
    ).rejects.toThrow(/connected platform/);

    await requireExplicitPlatformGrant(customer, "youtube", publishGrant);
    await finalizePlatformAuthorization(customer, "youtube", {
      accountLabel: "Channel",
      oauthScopes: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.upload",
      ],
    });

    await upsertSocialCredentialForActor(customer, "youtube", {
      tokens: { accessToken: "access-expired" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      accessTokenExpiresAt: new Date(Date.now() - 60_000),
    });
    await expect(
      setAutomaticPublishingForActor(customer, "youtube", { enabled: true, confirmed: true }),
    ).rejects.toThrow(/connected platform/);

    await upsertSocialCredentialForActor(customer, "youtube", {
      tokens: { accessToken: "access-live", refreshToken: "refresh-live" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
    });
    await setAutomaticPublishingForActor(customer, "youtube", {
      enabled: true,
      confirmed: true,
      contentTypes: ["video"],
    });
    const enabled = await listPlatformAuthorizations(customer);
    expect(enabled[0]?.automaticPublishingAuthorized).toBe(true);

    await setAutomaticPublishingForActor(customer, "youtube", { enabled: false, confirmed: true });
    await revokePlatformAuthorization(customer, "youtube", "customer_disconnected");
    expect(await hasActiveSocialCredential(customer.organizationId, "youtube")).toBe(true);
    await expect(
      setAutomaticPublishingForActor(customer, "youtube", { enabled: true, confirmed: true }),
    ).rejects.toThrow(/connected platform/);
    const revoked = await listPlatformAuthorizations(customer);
    expect(revoked[0]?.status).toBe("revoked");
    expect(revoked[0]?.automaticPublishingAuthorized).toBe(false);
  });

  it("revokes the grant when Google returns invalid_grant and does not reuse the token", async () => {
    setAuthorizationStoreForTests(createMemoryAuthorizationStore());
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
    const customer = actor();
    await requireExplicitPlatformGrant(customer, "youtube", publishGrant);
    await finalizePlatformAuthorization(customer, "youtube", {
      oauthScopes: ["https://www.googleapis.com/auth/youtube.upload"],
    });
    await upsertSocialCredentialForActor(customer, "youtube", {
      tokens: { accessToken: "stale", refreshToken: "refresh-stale" },
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      accessTokenExpiresAt: new Date(Date.now() - 120_000),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "invalid_grant" }),
      })),
    );

    expect(await getValidSocialAccessTokenForActor(customer, "youtube")).toBeNull();
    expect(await getValidSocialAccessTokenForActor(customer, "youtube")).toBeNull();
    expect(await hasActiveSocialCredential(customer.organizationId, "youtube")).toBe(false);
    const rows = await listPlatformAuthorizations(customer);
    expect(rows[0]?.status).toBe("revoked");
    await expect(
      setAutomaticPublishingForActor(customer, "youtube", { enabled: true, confirmed: true }),
    ).rejects.toThrow(/connected platform/);
  });
});
