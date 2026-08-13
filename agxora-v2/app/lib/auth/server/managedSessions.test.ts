/**
 * Phase 44.2 — server session list / revoke security tests.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET as listSessionsRoute } from "@/app/api/v1/auth/sessions/route";
import {
  listManagedSessionsForToken,
  revokeManagedSessionForToken,
  revokeOtherManagedSessionsForToken,
} from "@/app/lib/auth/server/managedSessions";
import {
  getSessionPublic,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
} from "@/app/lib/auth/server/service";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  createCustomerForActor,
  listCustomersForActor,
} from "@/app/lib/crm/persistence/customerService";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory/types";

const prisma = new PrismaClient();

function draft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return {
    companyName: "Session Test Co",
    contactName: "Session Tester",
    email: `session.${Date.now()}@test.example`,
    phone: "+49 40 123456",
    website: "https://session-test.example",
    industry: "Technology",
    country: "DE",
    city: "Berlin",
    address: "Teststrasse 1",
    taxNumber: "DE123",
    status: "lead",
    owner: "Tester",
    tags: "",
    ...partial,
  };
}

async function wipe(): Promise<void> {
  await prisma.customer.deleteMany();
  await prisma.controlPlaneAuditEvent.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}

function assertSafePayload(payload: unknown, secrets: readonly string[]): void {
  const json = JSON.stringify(payload);
  expect(json).not.toMatch(/passwordHash/i);
  expect(json).not.toMatch(/"token"/);
  expect(json.toLowerCase()).not.toContain("password");
  for (const secret of secrets) {
    expect(json).not.toContain(secret);
  }
}

beforeEach(async () => {
  await wipe();
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("Phase 44.2 session list authorization", () => {
  it("unauthenticated session list → 401", async () => {
    const res = await listSessionsRoute();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("unauthorized");

    await expect(listManagedSessionsForToken(null)).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
    await expect(listManagedSessionsForToken("bogus-token")).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
  });

  it("authenticated user sees only own sessions and current is cookie-derived", async () => {
    const a1 = await registerWithPassword({
      email: "owner-a@session.test",
      password: "SecurePass1!",
      displayName: "Owner A",
    });
    const a2 = await loginWithPassword({
      email: "owner-a@session.test",
      password: "SecurePass1!",
    });
    const b = await registerWithPassword({
      email: "owner-b@session.test",
      password: "SecurePass1!",
      displayName: "Owner B",
    });

    const listedA = await listManagedSessionsForToken(a2.rawSessionToken);
    expect(listedA.sessions).toHaveLength(2);
    expect(listedA.sessions.filter((row) => row.current)).toHaveLength(1);
    expect(listedA.sessions.find((row) => row.current)?.id).toBe(a2.session.sessionId);
    expect(listedA.sessions.some((row) => row.id === a1.session.sessionId)).toBe(true);
    expect(listedA.sessions.some((row) => row.id === b.session.sessionId)).toBe(false);

    const listedB = await listManagedSessionsForToken(b.rawSessionToken);
    expect(listedB.sessions).toHaveLength(1);
    expect(listedB.sessions[0]?.id).toBe(b.session.sessionId);
    expect(listedB.sessions[0]?.current).toBe(true);

    assertSafePayload(listedA, [
      a1.rawSessionToken,
      a2.rawSessionToken,
      b.rawSessionToken,
    ]);
    assertSafePayload(listedB, [b.rawSessionToken]);
    for (const row of listedA.sessions) {
      expect(Object.keys(row).sort()).toEqual(["createdAt", "current", "expiresAt", "id"]);
    }
  });

  it("omits expired and already-revoked sessions", async () => {
    const registered = await registerWithPassword({
      email: "stale@session.test",
      password: "SecurePass1!",
      displayName: "Stale User",
    });
    const live = await loginWithPassword({
      email: "stale@session.test",
      password: "SecurePass1!",
    });
    await prisma.session.update({
      where: { id: registered.session.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const listed = await listManagedSessionsForToken(live.rawSessionToken);
    expect(listed.sessions.map((row) => row.id)).toEqual([live.session.sessionId]);
  });
});

describe("Phase 44.2 session revoke", () => {
  it("revokes own secondary session and rejects the revoked token", async () => {
    await registerWithPassword({
      email: "revoke-own@session.test",
      password: "SecurePass1!",
      displayName: "Revoke Own",
    });
    const first = await loginWithPassword({
      email: "revoke-own@session.test",
      password: "SecurePass1!",
    });
    const second = await loginWithPassword({
      email: "revoke-own@session.test",
      password: "SecurePass1!",
    });

    const result = await revokeManagedSessionForToken(
      second.rawSessionToken,
      first.session.sessionId,
    );
    expect(result.ok).toBe(true);
    expect(result.id).toBe(first.session.sessionId);
    assertSafePayload(result, [first.rawSessionToken, second.rawSessionToken]);

    expect(await getActorBySessionToken(first.rawSessionToken)).toBeNull();
    expect(await getSessionPublic(first.rawSessionToken)).toBeNull();
    expect(await getActorBySessionToken(second.rawSessionToken)).toBeTruthy();

    const remaining = await listManagedSessionsForToken(second.rawSessionToken);
    expect(remaining.sessions.some((row) => row.id === first.session.sessionId)).toBe(
      false,
    );
    expect(remaining.sessions.find((row) => row.current)?.id).toBe(
      second.session.sessionId,
    );
  });

  it("cannot revoke another user's session", async () => {
    const a = await registerWithPassword({
      email: "cross-a@session.test",
      password: "SecurePass1!",
      displayName: "Cross A",
    });
    const b = await registerWithPassword({
      email: "cross-b@session.test",
      password: "SecurePass1!",
      displayName: "Cross B",
    });

    await expect(
      revokeManagedSessionForToken(b.rawSessionToken, a.session.sessionId),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });

    expect(await getActorBySessionToken(a.rawSessionToken)).toBeTruthy();
  });

  it("cannot revoke the current session via revoke API", async () => {
    const registered = await registerWithPassword({
      email: "current@session.test",
      password: "SecurePass1!",
      displayName: "Current User",
    });
    await expect(
      revokeManagedSessionForToken(
        registered.rawSessionToken,
        registered.session.sessionId,
      ),
    ).rejects.toMatchObject({ code: "validation", status: 400 });
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeTruthy();
  });

  it("ignores forged owner/userId because actor comes from the session token", async () => {
    const a = await registerWithPassword({
      email: "forge-a@session.test",
      password: "SecurePass1!",
      displayName: "Forge A",
    });
    const b = await registerWithPassword({
      email: "forge-b@session.test",
      password: "SecurePass1!",
      displayName: "Forge B",
    });

    const listed = await listManagedSessionsForToken(a.rawSessionToken);
    expect(listed.sessions.every((row) => row.id !== b.session.sessionId)).toBe(true);
    await expect(
      revokeManagedSessionForToken(a.rawSessionToken, b.session.sessionId),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("revoke-others keeps the current session and invalidates the rest", async () => {
    await registerWithPassword({
      email: "others@session.test",
      password: "SecurePass1!",
      displayName: "Others User",
    });
    const first = await loginWithPassword({
      email: "others@session.test",
      password: "SecurePass1!",
    });
    const second = await loginWithPassword({
      email: "others@session.test",
      password: "SecurePass1!",
    });

    const result = await revokeOtherManagedSessionsForToken(second.rawSessionToken);
    expect(result.ok).toBe(true);
    expect(result.revokedCount).toBeGreaterThanOrEqual(2);
    expect(await getActorBySessionToken(first.rawSessionToken)).toBeNull();
    expect(await getActorBySessionToken(second.rawSessionToken)).toBeTruthy();
  });
});

describe("Phase 44.2 logout and tenancy regression", () => {
  it("logout still revokes the current session", async () => {
    const registered = await registerWithPassword({
      email: "logout-reg@session.test",
      password: "SecurePass1!",
      displayName: "Logout Reg",
    });
    await listManagedSessionsForToken(registered.rawSessionToken);
    await logoutSession(registered.rawSessionToken);
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeNull();
    expect(await getSessionPublic(registered.rawSessionToken)).toBeNull();
    await expect(
      listManagedSessionsForToken(registered.rawSessionToken),
    ).rejects.toMatchObject({ code: "unauthorized", status: 401 });
  });

  it("CRM tenancy still scopes customers after session listing", async () => {
    const a = await registerWithPassword({
      email: "crm-a@session.test",
      password: "SecurePass1!",
      displayName: "CRM A",
    });
    const b = await registerWithPassword({
      email: "crm-b@session.test",
      password: "SecurePass1!",
      displayName: "CRM B",
    });
    const actorA = await getActorBySessionToken(a.rawSessionToken);
    const actorB = await getActorBySessionToken(b.rawSessionToken);
    expect(actorA && actorB).toBeTruthy();
    await createCustomerForActor(actorA!, draft({ companyName: "Alpha Only" }));
    await listManagedSessionsForToken(a.rawSessionToken);
    const listedA = await listCustomersForActor(actorA!);
    const listedB = await listCustomersForActor(actorB!);
    expect(listedA.some((row) => row.companyName === "Alpha Only")).toBe(true);
    expect(listedB.some((row) => row.companyName === "Alpha Only")).toBe(false);
  });
});
