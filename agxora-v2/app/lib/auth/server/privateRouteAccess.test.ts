/**
 * RC P0 — private-route server session gate.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/app/lib/auth/server/password";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import {
  decidePrivateRouteAccess,
  evaluatePrivatePageAccess,
  inspectSessionToken,
} from "@/app/lib/auth/server/privateRouteAccess";

const prisma = new PrismaClient();

async function wipe(): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUser(): Promise<{ userId: string }> {
  const user = await prisma.user.create({
    data: {
      email: `gate-${Date.now()}@agxora.test`,
      name: "Gate User",
      passwordHash: await hashPassword("SecurePass1!"),
      emailVerified: true,
    },
  });
  const org = await prisma.organization.create({
    data: {
      name: "Gate Org",
      slug: `gate-${user.id.slice(0, 8)}`,
      ownerId: user.id,
      workspaces: { create: { name: "Default", slug: "default" } },
    },
    include: { workspaces: true },
  });
  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      workspaceId: org.workspaces[0].id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  return { userId: user.id };
}

beforeAll(async () => {
  await wipe();
});

beforeEach(async () => {
  await wipe();
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("inspectSessionToken", () => {
  it("returns missing when no cookie", async () => {
    expect(await inspectSessionToken(null)).toEqual({ status: "missing" });
    expect(await inspectSessionToken("")).toEqual({ status: "missing" });
    expect(await inspectSessionToken("   ")).toEqual({ status: "missing" });
  });

  it("rejects a fake cookie that does not hash to a stored session", async () => {
    await seedUser();
    expect(await inspectSessionToken("notarealsessiontoken123")).toEqual({
      status: "invalid",
    });
  });

  it("accepts a valid hashed server session", async () => {
    const { userId } = await seedUser();
    const raw = "valid-session-token-value-32bytes-aa";
    await prisma.session.create({
      data: sessionRowForTests({
        userId,
        rawToken: raw,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    });
    const inspection = await inspectSessionToken(raw);
    expect(inspection.status).toBe("ok");
    expect(inspection.userId).toBe(userId);
  });

  it("rejects an expired session and marks it revoked", async () => {
    const { userId } = await seedUser();
    const raw = "expired-session-token-value-32bytes";
    const row = await prisma.session.create({
      data: sessionRowForTests({
        userId,
        rawToken: raw,
        expiresAt: new Date(Date.now() - 1000),
      }),
    });
    const inspection = await inspectSessionToken(raw);
    expect(inspection.status).toBe("expired");
    const stored = await prisma.session.findUnique({ where: { id: row.id } });
    expect(stored?.revokedAt).toBeTruthy();
  });

  it("rejects a revoked session", async () => {
    const { userId } = await seedUser();
    const raw = "revoked-session-token-value-32bytes";
    await prisma.session.create({
      data: {
        ...sessionRowForTests({
          userId,
          rawToken: raw,
          expiresAt: new Date(Date.now() + 60_000),
        }),
        revokedAt: new Date(),
      },
    });
    expect(await inspectSessionToken(raw)).toMatchObject({ status: "revoked" });
  });
});

describe("decidePrivateRouteAccess", () => {
  it("allows a valid server session", () => {
    expect(
      decidePrivateRouteAccess({
        authRequired: true,
        inspection: { status: "ok", sessionId: "s", userId: "u" },
      }),
    ).toEqual({ allow: true });
  });

  it("rejects no cookie when auth is required", () => {
    const decision = decidePrivateRouteAccess({
      authRequired: true,
      inspection: { status: "missing" },
      nextPath: "/dashboard",
    });
    expect(decision.allow).toBe(false);
    if (!decision.allow) {
      expect(decision.reason).toBe("unauthorized");
      expect(decision.redirectTo).toBe("/login?next=%2Fdashboard");
    }
  });

  it("allows anonymous access only when auth is not required and no cookie", () => {
    expect(
      decidePrivateRouteAccess({
        authRequired: false,
        inspection: { status: "missing" },
      }),
    ).toEqual({ allow: true });
  });

  it("rejects fake cookies even when auth is not required", () => {
    const decision = decidePrivateRouteAccess({
      authRequired: false,
      inspection: { status: "invalid" },
    });
    expect(decision.allow).toBe(false);
    if (!decision.allow) {
      expect(decision.redirectTo).toBe("/session-expired");
    }
  });

  it("rejects expired and revoked sessions", () => {
    for (const status of ["expired", "revoked"] as const) {
      const decision = decidePrivateRouteAccess({
        authRequired: true,
        inspection: { status },
      });
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.reason).toBe("expired_session");
        expect(decision.redirectTo).toBe("/session-expired");
      }
    }
  });
});

describe("evaluatePrivatePageAccess", () => {
  it("allows a valid hashed session when auth is required", async () => {
    const previous = process.env.AGXORA_AUTH_REQUIRED;
    process.env.AGXORA_AUTH_REQUIRED = "true";
    try {
      const { userId } = await seedUser();
      const raw = "page-access-valid-token-32bytes-xx";
      await prisma.session.create({
        data: sessionRowForTests({
          userId,
          rawToken: raw,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      });
      expect(await evaluatePrivatePageAccess(raw, "/dashboard")).toEqual({
        allow: true,
      });
    } finally {
      if (previous === undefined) delete process.env.AGXORA_AUTH_REQUIRED;
      else process.env.AGXORA_AUTH_REQUIRED = previous;
    }
  });

  it("rejects missing, fake, expired, and revoked cookies when auth is required", async () => {
    const previous = process.env.AGXORA_AUTH_REQUIRED;
    process.env.AGXORA_AUTH_REQUIRED = "true";
    try {
      const { userId } = await seedUser();
      const expiredRaw = "page-access-expired-token-32bytes";
      const revokedRaw = "page-access-revoked-token-32bytes";
      await prisma.session.create({
        data: sessionRowForTests({
          userId,
          rawToken: expiredRaw,
          expiresAt: new Date(Date.now() - 1000),
        }),
      });
      await prisma.session.create({
        data: {
          ...sessionRowForTests({
            userId,
            rawToken: revokedRaw,
            expiresAt: new Date(Date.now() + 60_000),
          }),
          revokedAt: new Date(),
        },
      });

      const missing = await evaluatePrivatePageAccess(null, "/dashboard");
      const fake = await evaluatePrivatePageAccess(
        "notarealsessiontoken123",
        "/dashboard",
      );
      const expired = await evaluatePrivatePageAccess(expiredRaw, "/dashboard");
      const revoked = await evaluatePrivatePageAccess(revokedRaw, "/dashboard");

      expect(missing.allow).toBe(false);
      if (!missing.allow) {
        expect(missing.redirectTo).toBe("/login?next=%2Fdashboard");
      }
      expect(fake.allow).toBe(false);
      if (!fake.allow) {
        expect(fake.redirectTo).toBe("/session-expired");
      }
      expect(expired.allow).toBe(false);
      if (!expired.allow) {
        expect(expired.redirectTo).toBe("/session-expired");
      }
      expect(revoked.allow).toBe(false);
      if (!revoked.allow) {
        expect(revoked.redirectTo).toBe("/session-expired");
      }
    } finally {
      if (previous === undefined) delete process.env.AGXORA_AUTH_REQUIRED;
      else process.env.AGXORA_AUTH_REQUIRED = previous;
    }
  });
});
