import { describe, expect, it } from "vitest";
import {
  agbAcceptanceGrantsPlatformAccess,
  assertSameTenant,
  buildPlatformConfirmation,
  canExecuteAutomaticPublishing,
  classifyConnectionStatus,
  containsSecretMaterial,
  evaluateConnectAuthorization,
  intersectWithOAuthScopes,
  needsLegalReacceptance,
  oauthScopesForPermissions,
  parseExplicitAuthorization,
  redactAuthorizationMetadata,
  supportedPermissionKeys,
  tenantScopedWhere,
  unsupportedFlagUpdates,
} from "./policy";
import {
  createMemoryAuthorizationStore,
  readMemoryAuthorizationAuditsForTests,
  requireExplicitPlatformGrant,
  revokePlatformAuthorization,
  setAuthorizationStoreForTests,
} from "./service";
import type { Actor } from "@/app/lib/tenancy/types";

function actor(organizationId: string, workspaceId = "ws-1"): Actor {
  return {
    userId: `user-${organizationId}`,
    email: `${organizationId}@example.com`,
    name: "Customer",
    organizationId,
    workspaceId,
    membershipId: "mem",
    role: "OWNER",
    sessionToken: "session",
  };
}

describe("external platform authorization policy", () => {
  it("does not treat AGB acceptance as platform access", () => {
    expect(agbAcceptanceGrantsPlatformAccess()).toBe(false);
    const decision = evaluateConnectAuthorization({
      provider: "youtube",
      request: parseExplicitAuthorization({ confirmed: false, permissions: ["connect_account"] }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe("explicit_authorization_required");
  });

  it("offers only permissions the provider actually implements", () => {
    expect(supportedPermissionKeys("youtube")).toEqual([
      "connect_account",
      "read_content",
      "create_content",
      "publish_posts",
      "create_ai_content",
      "auto_publish_ai",
    ]);
    expect(supportedPermissionKeys("email_gmail")).not.toContain("publish_posts");
    expect(supportedPermissionKeys("email_gmail")).not.toContain("delete_posts");
    expect(supportedPermissionKeys("instagram")).toEqual([
      "connect_account",
      "read_content",
      "publish_posts",
    ]);
    expect(supportedPermissionKeys("instagram")).not.toContain("auto_publish_ai");
    expect(supportedPermissionKeys("instagram")).not.toContain("read_messages");
    expect(supportedPermissionKeys("youtube")).not.toContain("read_comments");
    expect(supportedPermissionKeys("youtube")).not.toContain("reply_messages");
  });

  it("rejects permission escalation onto unsupported scopes", () => {
    const decision = evaluateConnectAuthorization({
      provider: "email_gmail",
      request: parseExplicitAuthorization({
        confirmed: true,
        permissions: ["connect_account", "delete_posts"],
      }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe("permission_not_supported");
    expect(
      unsupportedFlagUpdates({
        provider: "email_gmail",
        flags: { canDelete: true, canPublish: true },
      }),
    ).toEqual(["canPublish", "canDelete"]);
  });

  it("requires a separate confirmation before automatic publishing", () => {
    const missing = evaluateConnectAuthorization({
      provider: "youtube",
      request: parseExplicitAuthorization({
        confirmed: true,
        permissions: ["connect_account", "publish_posts"],
        automaticPublishing: true,
      }),
    });
    expect(missing.ok).toBe(false);
    const granted = evaluateConnectAuthorization({
      provider: "youtube",
      request: parseExplicitAuthorization({
        confirmed: true,
        permissions: ["connect_account", "publish_posts"],
        aiContent: true,
        automaticPublishing: true,
        automaticPublishingConfirmed: true,
        accountLabel: "@company",
      }),
    });
    expect(granted.ok).toBe(true);
    if (granted.ok) {
      expect(granted.automaticPublishing).toBe(true);
      expect(granted.aiContent).toBe(true);
      expect(granted.confirmationText).toContain("ausschließlich die von mir freigegebenen");
      expect(granted.automaticPublishingText).toContain("automatisch");
      expect(granted.oauthScopes).toEqual([
        "https://www.googleapis.com/auth/youtube.upload",
      ]);
    }
    expect(
      canExecuteAutomaticPublishing({
        status: "connected",
        automaticPublishingAuthorized: false,
        publishGranted: true,
        sameTenant: true,
      }),
    ).toBe(false);
  });

  it("narrows OAuth scopes to the granted permissions", () => {
    expect(
      oauthScopesForPermissions("email_gmail", ["connect_account", "read_messages"]),
    ).toEqual(["https://www.googleapis.com/auth/gmail.readonly"]);
    expect(
      intersectWithOAuthScopes(
        "youtube",
        ["connect_account", "read_content", "publish_posts"],
        ["https://www.googleapis.com/auth/youtube.readonly"],
      ),
    ).toEqual(["connect_account", "read_content"]);
  });

  it("never accepts external passwords", () => {
    expect(containsSecretMaterial({ password: "secret" })).toBe(true);
    expect(redactAuthorizationMetadata({ accessToken: "abc", platform: "youtube" })).toEqual({
      platform: "youtube",
    });
    expect(buildPlatformConfirmation({
      provider: "instagram",
      accountLabel: null,
      permissions: ["connect_account"],
      aiContent: false,
      automaticPublishing: false,
    })).not.toMatch(/password/i);
  });

  it("classifies revoked, expired, and disconnected accounts", () => {
    const now = new Date("2026-10-01T12:00:00.000Z");
    expect(
      classifyConnectionStatus({
        authorizationStatus: "connected",
        connectionStatus: "connected",
        revokedAt: new Date(),
        accessTokenExpiresAt: null,
        hasRefreshToken: true,
        now,
      }),
    ).toBe("revoked");
    expect(
      classifyConnectionStatus({
        authorizationStatus: "connected",
        connectionStatus: "connected",
        revokedAt: null,
        accessTokenExpiresAt: new Date("2026-10-01T11:00:00.000Z"),
        hasRefreshToken: false,
        now,
      }),
    ).toBe("expired");
    expect(
      classifyConnectionStatus({
        authorizationStatus: "disconnected",
        connectionStatus: "disconnected",
        revokedAt: null,
        accessTokenExpiresAt: null,
        hasRefreshToken: false,
        now,
      }),
    ).toBe("disconnected");
  });

  it("isolates tenants and detects a new legal version", () => {
    expect(assertSameTenant("org-a", "org-b")).toBe(false);
    expect(
      tenantScopedWhere({
        organizationId: "org-a",
        workspaceId: "ws-1",
        provider: "youtube",
      }).organizationId,
    ).toBe("org-a");
    expect(
      needsLegalReacceptance({ acceptedVersion: "1.0", currentVersion: "1.1" }),
    ).toBe(true);
    expect(
      needsLegalReacceptance({ acceptedVersion: "1.1", currentVersion: "1.1" }),
    ).toBe(false);
  });

  it("records and revokes a grant without exposing another customer's account", async () => {
    setAuthorizationStoreForTests(createMemoryAuthorizationStore());
    const customerA = actor("org-a");
    const customerB = actor("org-b");
    await requireExplicitPlatformGrant(customerA, "youtube", {
      confirmed: true,
      permissions: ["connect_account", "read_content", "publish_posts"],
      aiContent: true,
      automaticPublishing: false,
      accountLabel: "@company",
    });
    await expect(
      requireExplicitPlatformGrant(customerB, "youtube", {
        confirmed: true,
        permissions: ["connect_account", "delete_posts"],
      }),
    ).rejects.toMatchObject({ code: "validation" });

    const audits = readMemoryAuthorizationAuditsForTests();
    expect(audits.some((entry) => entry.actor.organizationId === "org-a")).toBe(true);
    expect(audits.some((entry) => entry.event === "authorization_granted")).toBe(true);

    await revokePlatformAuthorization(customerA, "youtube", "customer_disconnect");
    const revoked = readMemoryAuthorizationAuditsForTests().filter(
      (entry) => entry.event === "authorization_revoked",
    );
    expect(revoked).toHaveLength(1);
    expect(revoked[0]?.actor.organizationId).toBe("org-a");
    await revokePlatformAuthorization(customerB, "youtube", "wrong_customer");
    expect(
      readMemoryAuthorizationAuditsForTests().filter(
        (entry) => entry.event === "authorization_revoked" && entry.actor.organizationId === "org-b",
      ),
    ).toHaveLength(0);
    setAuthorizationStoreForTests(null);
  });
});
