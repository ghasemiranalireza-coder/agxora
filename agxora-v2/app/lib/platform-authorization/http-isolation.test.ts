/**
 * Two-organization HTTP checks for platform authorization.
 * Uses the test database and the real route handlers with the session header
 * that production reads. Does not print tokens.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";

const headerToken = { current: "" };

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) =>
      name.toLowerCase() === "x-agxora-session-token" ? headerToken.current || null : null,
  }),
  cookies: async () => ({ get: () => undefined }),
}));

import { POST as connectRoute } from "@/app/api/v1/integrations/[provider]/connect/route";
import { POST as disconnectRoute } from "@/app/api/v1/integrations/[provider]/disconnect/route";
import { GET as listAuthorizations } from "@/app/api/v1/integrations/authorizations/route";
import { GET as previewRoute } from "@/app/api/v1/integrations/[provider]/authorization/route";
import { PUT as autoPublishRoute } from "@/app/api/v1/integrations/[provider]/automatic-publishing/route";
import { GET as listIntegrations } from "@/app/api/v1/integrations/route";
import { hasActiveSocialCredential, upsertSocialCredentialForActor } from "@/app/lib/social/credentials";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";

const prisma = new PrismaClient();
const TOKEN_A = "authz_http_token_a";
const TOKEN_B = "authz_http_token_b";
const EMAIL_A = "authz-http-a@test.agxora";
const EMAIL_B = "authz-http-b@test.agxora";
const SECRET_B = "ya29.secret-org-b-do-not-leak";

const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) });

function asActor(token: string) {
  headerToken.current = token;
  return new Request("http://localhost/api/v1/integrations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-agxora-session-token": token,
    },
  });
}

async function postConnect(token: string, provider: string, body: unknown) {
  headerToken.current = token;
  return connectRoute(
    new Request(`http://localhost/api/v1/integrations/${provider}/connect`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agxora-session-token": token,
      },
      body: JSON.stringify(body),
    }),
    ctx(provider),
  );
}

async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: [EMAIL_A, EMAIL_B] } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return;
  const orgs = await prisma.organization.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  const orgIds = orgs.map((org) => org.id);
  if (orgIds.length > 0) {
    await prisma.authorizationAuditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.platformPermission.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.platformAuthorization.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.legalAcceptance.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.integrationConnection.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.socialPlatformCredential.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaignItem.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.membership.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.workspace.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

describe("platform authorization HTTP tenant isolation", () => {
  beforeAll(async () => {
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID = "client";
    process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET = "secret";
    process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI = "https://app.example/callback";
    await cleanup();
    const userA = await prisma.user.create({ data: { email: EMAIL_A, name: "Authz A", emailVerified: true } });
    const userB = await prisma.user.create({ data: { email: EMAIL_B, name: "Authz B", emailVerified: true } });
    const orgA = await prisma.organization.create({
      data: {
        name: "Authz Org A",
        slug: "authz-http-a",
        ownerId: userA.id,
        workspaces: { create: { name: "Default", slug: "default" } },
      },
      include: { workspaces: true },
    });
    const orgB = await prisma.organization.create({
      data: {
        name: "Authz Org B",
        slug: "authz-http-b",
        ownerId: userB.id,
        workspaces: { create: { name: "Default", slug: "default" } },
      },
      include: { workspaces: true },
    });
    await prisma.membership.createMany({
      data: [
        { userId: userA.id, organizationId: orgA.id, workspaceId: orgA.workspaces[0].id, role: "OWNER" },
        { userId: userB.id, organizationId: orgB.id, workspaceId: orgB.workspaces[0].id, role: "OWNER" },
      ],
    });
    const expiresAt = new Date(Date.now() + 86_400_000);
    await prisma.session.createMany({
      data: [
        sessionRowForTests({ userId: userA.id, rawToken: TOKEN_A, expiresAt, activeWorkspaceId: orgA.workspaces[0].id }),
        sessionRowForTests({ userId: userB.id, rawToken: TOKEN_B, expiresAt, activeWorkspaceId: orgB.workspaces[0].id }),
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("refuses OAuth until the customer confirms, and rejects secrets, scopes, and unsupported permissions", async () => {
    const missing = await postConnect(TOKEN_A, "youtube", { redirectPath: "/dashboard/settings" });
    expect(missing.status).toBeGreaterThanOrEqual(400);
    const missingBody = await missing.json();
    expect(JSON.stringify(missingBody)).not.toContain("accounts.google.com");

    const password = await postConnect(TOKEN_A, "youtube", {
      confirmed: true,
      permissions: ["connect_account"],
      password: "hunter2",
    });
    expect(password.status).toBeGreaterThanOrEqual(400);

    const token = await postConnect(TOKEN_A, "youtube", {
      confirmed: true,
      permissions: ["connect_account"],
      accessToken: "ya29.nope",
    });
    expect(token.status).toBeGreaterThanOrEqual(400);

    const scopes = await postConnect(TOKEN_A, "youtube", {
      confirmed: true,
      permissions: ["connect_account"],
      oauthScopes: ["https://www.googleapis.com/auth/youtube.force-ssl"],
    });
    expect(scopes.status).toBeGreaterThanOrEqual(400);

    const unsupported = await postConnect(TOKEN_A, "youtube", {
      confirmed: true,
      permissions: ["connect_account", "delete_posts"],
    });
    expect(unsupported.status).toBeGreaterThanOrEqual(400);

    const unknown = await postConnect(TOKEN_A, "shopify", {
      confirmed: true,
      permissions: ["connect_account"],
    });
    expect(unknown.status).toBeGreaterThanOrEqual(400);

    const preview = await previewRoute(asActor(TOKEN_A), ctx("youtube"));
    const previewBody = await preview.json();
    const keys = (previewBody.permissions ?? []).map((item: { key: string }) => item.key);
    expect(keys).toContain("connect_account");
    expect(keys).not.toContain("delete_posts");
    expect(keys).not.toContain("read_comments");
  });

  it("keeps organization A and B authorizations, tokens, and audit rows apart", async () => {
    const actorB = await getActorBySessionToken(TOKEN_B);
    expect(actorB).toBeTruthy();
    await upsertSocialCredentialForActor(actorB!, "youtube", {
      tokens: { accessToken: SECRET_B, refreshToken: "refresh-b" },
      scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
      externalAccountId: "channel-b",
      externalAccountName: "Org B Channel",
    });
    const grantedB = await postConnect(TOKEN_B, "youtube", {
      confirmed: true,
      permissions: ["connect_account", "read_content"],
      accountLabel: "Org B Channel",
      organizationId: "not-used",
    });
    expect(grantedB.status).toBe(200);

    const grantedA = await postConnect(TOKEN_A, "youtube", {
      confirmed: true,
      permissions: ["connect_account", "read_content", "publish_posts"],
      accountLabel: "Org A Channel",
      organizationId: actorB!.organizationId,
    });
    expect(grantedA.status).toBe(200);
    const grantedABody = await grantedA.json();
    expect(String(grantedABody.authorizationUrl ?? "")).toContain("accounts.google.com");
    expect(String(grantedABody.authorizationUrl)).not.toContain("youtube.force-ssl");

    const listA = await listAuthorizations();
    headerToken.current = TOKEN_A;
    const listAResponse = await listAuthorizations();
    const listABody = await listAResponse.json();
    expect(listA.status).toBe(200);
    expect(JSON.stringify(listABody)).toContain("Org A Channel");
    expect(JSON.stringify(listABody)).not.toContain("Org B Channel");
    expect(JSON.stringify(listABody)).not.toContain(SECRET_B);

    headerToken.current = TOKEN_B;
    const listB = await listAuthorizations();
    const listBBody = await listB.json();
    expect(JSON.stringify(listBBody)).toContain("Org B Channel");
    expect(JSON.stringify(listBBody)).not.toContain("Org A Channel");

    headerToken.current = TOKEN_A;
    const integrations = await listIntegrations();
    const integrationsBody = await integrations.json();
    expect(JSON.stringify(integrationsBody)).not.toContain(SECRET_B);
    expect(integrationsBody.organizationId).not.toBe(actorB!.organizationId);

    const rowA = await prisma.platformAuthorization.findFirst({
      where: { organizationId: (await getActorBySessionToken(TOKEN_A))!.organizationId, provider: "youtube" },
    });
    const rowB = await prisma.platformAuthorization.findFirst({
      where: { organizationId: actorB!.organizationId, provider: "youtube" },
    });
    expect(rowA?.organizationId).not.toBe(rowB?.organizationId);
    expect(rowA?.accountLabel).toBe("Org A Channel");

    headerToken.current = TOKEN_A;
    const disconnectA = await disconnectRoute(asActor(TOKEN_A), ctx("youtube"));
    expect(disconnectA.status).toBe(200);
    const rowBAfter = await prisma.platformAuthorization.findFirst({
      where: { id: rowB!.id },
    });
    expect(rowBAfter?.status).not.toBe("revoked");
    expect(await hasActiveSocialCredential(actorB!.organizationId, "youtube")).toBe(true);

    const auditsA = await prisma.authorizationAuditLog.findMany({
      where: { organizationId: rowA!.organizationId },
    });
    const auditsB = await prisma.authorizationAuditLog.findMany({
      where: { organizationId: actorB!.organizationId },
    });
    expect(auditsA.length).toBeGreaterThan(0);
    expect(auditsB.length).toBeGreaterThan(0);
    expect(auditsA.every((row) => row.organizationId !== actorB!.organizationId)).toBe(true);
  });

  it("does not enable automatic publishing without a connected publish grant", async () => {
    headerToken.current = TOKEN_A;
    const denied = await autoPublishRoute(
      new Request("http://localhost/api/v1/integrations/youtube/automatic-publishing", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-agxora-session-token": TOKEN_A,
        },
        body: JSON.stringify({ enabled: true, confirmed: true }),
      }),
      ctx("youtube"),
    );
    expect(denied.status).toBeGreaterThanOrEqual(400);

    headerToken.current = TOKEN_B;
    const wrongOrg = await autoPublishRoute(
      new Request("http://localhost/api/v1/integrations/youtube/automatic-publishing", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-agxora-session-token": TOKEN_B,
          "x-organization-id": (await getActorBySessionToken(TOKEN_A))!.organizationId,
        },
        body: JSON.stringify({
          enabled: true,
          confirmed: true,
          organizationId: (await getActorBySessionToken(TOKEN_A))!.organizationId,
        }),
      }),
      ctx("youtube"),
    );
    expect(wrongOrg.status).toBeGreaterThanOrEqual(400);
    const stillA = await prisma.platformAuthorization.findFirst({
      where: { organizationId: (await getActorBySessionToken(TOKEN_A))!.organizationId, provider: "youtube" },
    });
    expect(stillA?.automaticPublishingAuthorized).toBe(false);
  });
});
