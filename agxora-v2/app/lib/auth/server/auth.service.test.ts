/**
 * Phase 43 — real authentication & trusted identity tests.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getActorBySessionToken,
} from "@/app/lib/tenancy/actor";
import { can } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  createCustomerForActor,
  listCustomersForActor,
} from "@/app/lib/crm/persistence/customerService";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory/types";
import {
  hashPassword,
  verifyPassword,
} from "@/app/lib/auth/server/password";
import { hashOpaqueToken, hashSessionToken } from "@/app/lib/auth/server/tokens";
import {
  getSessionPublic,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  requestPasswordReset,
  resetPasswordWithToken,
  switchActiveWorkspace,
  createEmailVerificationToken,
  verifyEmailWithToken,
} from "@/app/lib/auth/server/service";
import {
  listManagedSessionsForToken,
  revokeManagedSessionForToken,
  revokeOtherManagedSessionsForToken,
} from "@/app/lib/auth/server/managedSessions";
import {
  forceMemoryEmailFailure,
  listMemoryEmailOutbox,
  memoryEmailProvider,
  resetMemoryEmailOutbox,
  setEmailProviderForTests,
} from "@/app/lib/email";

const prisma = new PrismaClient();

function draft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return {
    companyName: "Auth Test Co",
    contactName: "Auth Tester",
    email: `auth.${Date.now()}@test.example`,
    phone: "+49 40 123456",
    website: "https://auth-test.example",
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

beforeAll(async () => {
  process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN = "1";
  process.env.AGXORA_EMAIL_PROVIDER = "none";
  delete process.env.AGXORA_AUTH_EMAIL_DELIVERY;
});

beforeEach(async () => {
  await wipe();
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  process.env.AGXORA_EMAIL_PROVIDER = "none";
});

afterAll(async () => {
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  await wipe();
  await prisma.$disconnect();
});

describe("Phase 43 password security", () => {
  it("hashes passwords with bcrypt and never equals plaintext", async () => {
    const hash = await hashPassword("SecretPass1!");
    expect(hash).not.toContain("SecretPass1!");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("SecretPass1!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("Phase 43 register / login / logout", () => {
  it("registers user + org + workspace + OWNER membership", async () => {
    const result = await registerWithPassword({
      email: "new@agxora.test",
      password: "SecurePass1!",
      displayName: "New User",
      companyName: "New Co",
    });

    expect(result.user.email).toBe("new@agxora.test");
    expect(result.session.accessToken).toBe("cookie");
    expect(JSON.stringify(result.user)).not.toMatch(/password/i);
    expect(JSON.stringify(result.session)).not.toContain(result.rawSessionToken);

    const user = await prisma.user.findUnique({ where: { email: "new@agxora.test" } });
    expect(user?.passwordHash).toBeTruthy();
    expect(user?.passwordHash).not.toBe("SecurePass1!");
    expect(JSON.stringify(user)).not.toContain("SecurePass1!");

    const membership = await prisma.membership.findFirst({
      where: { userId: user!.id },
    });
    expect(membership?.role).toBe("OWNER");

    const actor = await getActorBySessionToken(result.rawSessionToken);
    expect(actor?.userId).toBe(user!.id);
    expect(actor?.role).toBe("OWNER");
    expect(actor?.organizationId).toBe(membership!.organizationId);
  });

  it("rejects duplicate registration", async () => {
    await registerWithPassword({
      email: "dup@agxora.test",
      password: "SecurePass1!",
      displayName: "Dup",
    });
    await expect(
      registerWithPassword({
        email: "dup@agxora.test",
        password: "SecurePass1!",
        displayName: "Dup2",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("logs in with valid credentials and fails with wrong password", async () => {
    await registerWithPassword({
      email: "login@agxora.test",
      password: "SecurePass1!",
      displayName: "Login User",
    });

    const ok = await loginWithPassword({
      email: "login@agxora.test",
      password: "SecurePass1!",
    });
    expect(ok.user.email).toBe("login@agxora.test");
    expect(ok.session.accessToken).toBe("cookie");

    await expect(
      loginWithPassword({
        email: "login@agxora.test",
        password: "WrongPass99!",
      }),
    ).rejects.toMatchObject({ message: "Invalid email or password" });

    await expect(
      loginWithPassword({
        email: "missing@agxora.test",
        password: "SecurePass1!",
      }),
    ).rejects.toMatchObject({ message: "Invalid email or password" });
  });

  it("logout revokes session so protected actor resolution fails", async () => {
    const registered = await registerWithPassword({
      email: "logout@agxora.test",
      password: "SecurePass1!",
      displayName: "Logout User",
    });
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeTruthy();

    await logoutSession(registered.rawSessionToken);
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeNull();
    expect(await getSessionPublic(registered.rawSessionToken)).toBeNull();
  });

  it("rejects expired sessions", async () => {
    const registered = await registerWithPassword({
      email: "expire@agxora.test",
      password: "SecurePass1!",
      displayName: "Expire User",
    });
    await prisma.session.updateMany({
      where: { tokenHash: hashSessionToken(registered.rawSessionToken) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeNull();
  });

  it("rejects revoked sessions", async () => {
    const registered = await registerWithPassword({
      email: "revoke@agxora.test",
      password: "SecurePass1!",
      displayName: "Revoke User",
    });
    await prisma.session.updateMany({
      where: { tokenHash: hashSessionToken(registered.rawSessionToken) },
      data: { revokedAt: new Date() },
    });
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeNull();
  });
});

describe("Phase 43 impersonation / tenancy hardening", () => {
  it("client cannot impersonate another user via foreign session token", async () => {
    const a = await registerWithPassword({
      email: "a@agxora.test",
      password: "SecurePass1!",
      displayName: "User A",
    });
    const b = await registerWithPassword({
      email: "b@agxora.test",
      password: "SecurePass1!",
      displayName: "User B",
    });

    const actorA = await getActorBySessionToken(a.rawSessionToken);
    const actorB = await getActorBySessionToken(b.rawSessionToken);
    expect(actorA?.userId).not.toBe(actorB?.userId);
    expect(actorA?.organizationId).not.toBe(actorB?.organizationId);

    // Token for A never resolves as B
    expect(actorA?.email).toBe("a@agxora.test");
    expect(actorB?.email).toBe("b@agxora.test");
  });

  it("client cannot switch into unauthorized workspace", async () => {
    const a = await registerWithPassword({
      email: "ws-a@agxora.test",
      password: "SecurePass1!",
      displayName: "WS A",
    });
    const b = await registerWithPassword({
      email: "ws-b@agxora.test",
      password: "SecurePass1!",
      displayName: "WS B",
    });
    const actorB = await getActorBySessionToken(b.rawSessionToken);

    await expect(
      switchActiveWorkspace(a.rawSessionToken, actorB!.workspaceId),
    ).rejects.toBeInstanceOf(PersistenceError);

    // After failed switch, actor A still in own workspace
    const actorA = await getActorBySessionToken(a.rawSessionToken);
    expect(actorA?.workspaceId).not.toBe(actorB!.workspaceId);
  });

  it("blocks cross-tenant CRM access", async () => {
    const a = await registerWithPassword({
      email: "crm-a@agxora.test",
      password: "SecurePass1!",
      displayName: "CRM A",
    });
    const b = await registerWithPassword({
      email: "crm-b@agxora.test",
      password: "SecurePass1!",
      displayName: "CRM B",
    });
    const actorA = (await getActorBySessionToken(a.rawSessionToken))!;
    const actorB = (await getActorBySessionToken(b.rawSessionToken))!;

    await createCustomerForActor(
      actorA,
      draft({
        email: `only-a-${Date.now()}@test.example`,
        companyName: "Only A Corp",
        contactName: "Only A",
      }),
    );
    const listB = await listCustomersForActor(actorB);
    expect(listB.length).toBe(0);
    const listA = await listCustomersForActor(actorA);
    expect(listA.length).toBe(1);
  });

  it("role elevation from client is impossible — role comes from membership", async () => {
    const owner = await registerWithPassword({
      email: "role-owner@agxora.test",
      password: "SecurePass1!",
      displayName: "Owner",
    });
    const ownerActor = (await getActorBySessionToken(owner.rawSessionToken))!;

    // Create member in same org/workspace
    const passwordHash = await hashPassword("SecurePass1!");
    const member = await prisma.user.create({
      data: {
        email: "role-member@agxora.test",
        name: "Member",
        passwordHash,
        emailVerified: true,
      },
    });
    await prisma.membership.create({
      data: {
        userId: member.id,
        organizationId: ownerActor.organizationId,
        workspaceId: ownerActor.workspaceId,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    const memberLogin = await loginWithPassword({
      email: "role-member@agxora.test",
      password: "SecurePass1!",
    });
    const memberActor = (await getActorBySessionToken(memberLogin.rawSessionToken))!;

    expect(memberActor.role).toBe("MEMBER");
    expect(can(memberActor, "customer.delete")).toBe(false);
    expect(can(ownerActor, "customer.delete")).toBe(true);
    expect(can(memberActor, "customer.read")).toBe(true);
    expect(can(memberActor, "customer.create")).toBe(true);
  });
});

describe("Phase 43 RBAC matrix", () => {
  it("OWNER / ADMIN / MEMBER permissions match policy", async () => {
    const ownerReg = await registerWithPassword({
      email: "rbac-owner@agxora.test",
      password: "SecurePass1!",
      displayName: "Owner",
    });
    const owner = (await getActorBySessionToken(ownerReg.rawSessionToken))!;

    const adminHash = await hashPassword("SecurePass1!");
    const adminUser = await prisma.user.create({
      data: {
        email: "rbac-admin@agxora.test",
        name: "Admin",
        passwordHash: adminHash,
      },
    });
    await prisma.membership.create({
      data: {
        userId: adminUser.id,
        organizationId: owner.organizationId,
        workspaceId: owner.workspaceId,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    const adminLogin = await loginWithPassword({
      email: "rbac-admin@agxora.test",
      password: "SecurePass1!",
    });
    const admin = (await getActorBySessionToken(adminLogin.rawSessionToken))!;

    const memberHash = await hashPassword("SecurePass1!");
    const memberUser = await prisma.user.create({
      data: {
        email: "rbac-member@agxora.test",
        name: "Member",
        passwordHash: memberHash,
      },
    });
    await prisma.membership.create({
      data: {
        userId: memberUser.id,
        organizationId: owner.organizationId,
        workspaceId: owner.workspaceId,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    const memberLogin = await loginWithPassword({
      email: "rbac-member@agxora.test",
      password: "SecurePass1!",
    });
    const member = (await getActorBySessionToken(memberLogin.rawSessionToken))!;

    for (const action of [
      "customer.read",
      "customer.create",
      "customer.update",
      "customer.delete",
    ] as const) {
      expect(can(owner, action)).toBe(true);
    }
    expect(can(admin, "customer.read")).toBe(true);
    expect(can(admin, "customer.create")).toBe(true);
    expect(can(admin, "customer.update")).toBe(true);
    expect(can(admin, "customer.delete")).toBe(true);
    expect(can(member, "customer.read")).toBe(true);
    expect(can(member, "customer.create")).toBe(true);
    expect(can(member, "customer.update")).toBe(true);
    expect(can(member, "customer.delete")).toBe(false);
  });
});

describe("Phase 43 password reset", () => {
  it("issues hashed one-time token, expires, invalidates sessions", async () => {
    const registered = await registerWithPassword({
      email: "reset@agxora.test",
      password: "SecurePass1!",
      displayName: "Reset User",
    });
    const oldToken = registered.rawSessionToken;

    const forgot = await requestPasswordReset("reset@agxora.test");
    expect(forgot.ok).toBe(true);
    expect(forgot.delivery).toBe("not_configured");
    expect(forgot.resetToken).toBeTruthy();

    const stored = await prisma.passwordResetToken.findFirst({
      where: { userId: registered.user.id },
    });
    expect(stored?.tokenHash).toBe(hashOpaqueToken(forgot.resetToken!));
    expect(stored?.tokenHash).not.toBe(forgot.resetToken);

    await resetPasswordWithToken({
      token: forgot.resetToken!,
      password: "BrandNewPass1!",
    });

    // Old session revoked
    expect(await getActorBySessionToken(oldToken)).toBeNull();

    // One-time use
    await expect(
      resetPasswordWithToken({
        token: forgot.resetToken!,
        password: "AnotherPass1!",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);

    // New password works
    const again = await loginWithPassword({
      email: "reset@agxora.test",
      password: "BrandNewPass1!",
    });
    expect(again.user.email).toBe("reset@agxora.test");
  });

  it("rejects expired reset tokens", async () => {
    const registered = await registerWithPassword({
      email: "reset-exp@agxora.test",
      password: "SecurePass1!",
      displayName: "Reset Exp",
    });
    const forgot = await requestPasswordReset("reset-exp@agxora.test");
    await prisma.passwordResetToken.updateMany({
      where: { userId: registered.user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(
      resetPasswordWithToken({
        token: forgot.resetToken!,
        password: "BrandNewPass1!",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("does not reveal whether email exists on forgot", async () => {
    const missing = await requestPasswordReset("nobody@agxora.test");
    const presentUser = await registerWithPassword({
      email: "present@agxora.test",
      password: "SecurePass1!",
      displayName: "Present",
    });
    expect(presentUser.user.email).toBe("present@agxora.test");
    const present = await requestPasswordReset("present@agxora.test");
    expect(missing.ok).toBe(true);
    expect(present.ok).toBe(true);
    expect(missing.delivery).toBe(present.delivery);
  });
});

describe("Phase 45 auth email delivery", () => {
  it("queues password-reset email on successful provider handoff", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    const registered = await registerWithPassword({
      email: "mail-reset@agxora.test",
      password: "SecurePass1!",
      displayName: "Mail Reset",
    });
    const forgot = await requestPasswordReset("mail-reset@agxora.test");
    expect(forgot.delivery).toBe("queued");
    const resetMails = listMemoryEmailOutbox().filter(
      (m) => m.kind === "password_reset",
    );
    expect(resetMails).toHaveLength(1);
    expect(resetMails[0]?.to).toBe("mail-reset@agxora.test");

    await resetPasswordWithToken({
      token: forgot.resetToken!,
      password: "BrandNewPass1!",
    });
    const again = await loginWithPassword({
      email: "mail-reset@agxora.test",
      password: "BrandNewPass1!",
    });
    expect(again.user.id).toBe(registered.user.id);
  });

  it("does not report queued when password-reset handoff fails", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    forceMemoryEmailFailure("smtp down");
    await registerWithPassword({
      email: "mail-fail@agxora.test",
      password: "SecurePass1!",
      displayName: "Mail Fail",
    });
    const forgot = await requestPasswordReset("mail-fail@agxora.test");
    expect(forgot.delivery).toBe("not_configured");
    expect(listMemoryEmailOutbox()).toHaveLength(0);
    // Token still usable via expose mode / trusted channel
    expect(forgot.resetToken).toBeTruthy();
    await resetPasswordWithToken({
      token: forgot.resetToken!,
      password: "RecoveredPass1!",
    });
  });

  it("queues verification email and accepts the existing token flow", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    const registered = await registerWithPassword({
      email: "verify-mail@agxora.test",
      password: "SecurePass1!",
      displayName: "Verify Mail",
    });
    expect(
      listMemoryEmailOutbox().some((m) => m.kind === "email_verification"),
    ).toBe(true);
    const issued = await createEmailVerificationToken(registered.user.id);
    expect(issued.delivery).toBe("queued");
    const verifyMails = listMemoryEmailOutbox().filter(
      (m) => m.kind === "email_verification",
    );
    expect(verifyMails.length).toBeGreaterThanOrEqual(2);
    const verified = await verifyEmailWithToken(issued.rawToken);
    expect(verified.emailVerified).toBe(true);
  });
});

describe("RC P0 email delivery and anti-enumeration", () => {
  it("does not expose reset tokens when the expose flag is unset", async () => {
    const previous = process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN;
    delete process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN;
    try {
      await registerWithPassword({
        email: "no-expose@agxora.test",
        password: "SecurePass1!",
        displayName: "No Expose",
      });
      const forgot = await requestPasswordReset("no-expose@agxora.test");
      expect(forgot.ok).toBe(true);
      expect(forgot.resetToken).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN;
      else process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN = previous;
    }
  });

  it("never exposes reset tokens in production even if the expose flag is set", async () => {
    const previousEnv = process.env.NEXT_PUBLIC_AGXORA_ENV;
    const previousFlag = process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN;
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN = "1";
    setEmailProviderForTests(memoryEmailProvider);
    try {
      await registerWithPassword({
        email: "prod-expose@agxora.test",
        password: "SecurePass1!",
        displayName: "Prod Expose",
      });
      const missing = await requestPasswordReset("prod-missing@agxora.test");
      const present = await requestPasswordReset("prod-expose@agxora.test");
      expect(missing).toEqual({ ok: true, delivery: "queued" });
      expect(present).toEqual({ ok: true, delivery: "queued" });
      expect(JSON.stringify(present)).not.toContain("resetToken");
    } finally {
      if (previousEnv === undefined) delete process.env.NEXT_PUBLIC_AGXORA_ENV;
      else process.env.NEXT_PUBLIC_AGXORA_ENV = previousEnv;
      if (previousFlag === undefined) {
        delete process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN;
      } else {
        process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN = previousFlag;
      }
    }
  });

  it("keeps forgot-password anti-enumeration when a provider is configured", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    await registerWithPassword({
      email: "enum-present@agxora.test",
      password: "SecurePass1!",
      displayName: "Enum Present",
    });
    const missing = await requestPasswordReset("enum-missing@agxora.test");
    const present = await requestPasswordReset("enum-present@agxora.test");
    expect(missing.ok).toBe(true);
    expect(present.ok).toBe(true);
    expect(missing.delivery).toBe(present.delivery);
    expect(present.delivery).toBe("queued");
    expect(missing.resetToken).toBeUndefined();
    const resetMails = listMemoryEmailOutbox().filter(
      (m) => m.kind === "password_reset",
    );
    expect(resetMails.map((m) => m.to)).toEqual(["enum-present@agxora.test"]);
  });

  it("queues registration verification email when a provider is configured", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    await registerWithPassword({
      email: "reg-verify@agxora.test",
      password: "SecurePass1!",
      displayName: "Reg Verify",
    });
    const verifyMails = listMemoryEmailOutbox().filter(
      (m) => m.kind === "email_verification",
    );
    expect(verifyMails).toHaveLength(1);
    expect(verifyMails[0]?.to).toBe("reg-verify@agxora.test");
    expect(verifyMails[0]?.text).toContain("token=");
  });
});

describe("Phase 44.3 session token hashing at rest", () => {
  it("stores tokenHash only — raw cookie token never persisted in PostgreSQL", async () => {
    const registered = await registerWithPassword({
      email: "hash-store@agxora.test",
      password: "SecurePass1!",
      displayName: "Hash Store",
    });

    const row = await prisma.session.findUnique({
      where: { id: registered.session.sessionId },
    });
    expect(row).toBeTruthy();
    expect(row!.tokenHash).toBe(hashSessionToken(registered.rawSessionToken));
    expect(row!.tokenHash).not.toBe(registered.rawSessionToken);
    expect(JSON.stringify(row)).not.toContain(registered.rawSessionToken);
    expect(Object.keys(row!)).not.toContain("token");
  });

  it("resolves actor, logout, revoke-one, revoke-others, and workspace switch via hash lookup", async () => {
    const registered = await registerWithPassword({
      email: "hash-flow@agxora.test",
      password: "SecurePass1!",
      displayName: "Hash Flow",
    });
    const second = await loginWithPassword({
      email: "hash-flow@agxora.test",
      password: "SecurePass1!",
    });

    expect(await getActorBySessionToken(second.rawSessionToken)).toBeTruthy();

    const listed = await listManagedSessionsForToken(second.rawSessionToken);
    expect(listed.sessions.find((row) => row.current)?.id).toBe(
      second.session.sessionId,
    );

    await revokeManagedSessionForToken(
      second.rawSessionToken,
      registered.session.sessionId,
    );
    expect(await getActorBySessionToken(registered.rawSessionToken)).toBeNull();
    expect(await getActorBySessionToken(second.rawSessionToken)).toBeTruthy();

    const third = await loginWithPassword({
      email: "hash-flow@agxora.test",
      password: "SecurePass1!",
    });
    const revokedOthers = await revokeOtherManagedSessionsForToken(
      third.rawSessionToken,
    );
    expect(revokedOthers.revokedCount).toBeGreaterThanOrEqual(1);
    expect(await getActorBySessionToken(second.rawSessionToken)).toBeNull();
    expect(await getActorBySessionToken(third.rawSessionToken)).toBeTruthy();

    const actor = (await getActorBySessionToken(third.rawSessionToken))!;
    const switched = await switchActiveWorkspace(
      third.rawSessionToken,
      actor.workspaceId,
    );
    expect(switched.workspaceId).toBe(actor.workspaceId);
  });

  it("rejects invalid session tokens fail-closed", async () => {
    expect(await getActorBySessionToken("totally-invalid-token")).toBeNull();
    expect(await getSessionPublic("totally-invalid-token")).toBeNull();
  });

  it("never exposes raw session token in auth API JSON", async () => {
    const registered = await registerWithPassword({
      email: "hash-json@agxora.test",
      password: "SecurePass1!",
      displayName: "Hash JSON",
    });
    expect(JSON.stringify(registered.user)).not.toContain(
      registered.rawSessionToken,
    );
    expect(JSON.stringify(registered.session)).not.toContain(
      registered.rawSessionToken,
    );
    const publicSession = await getSessionPublic(registered.rawSessionToken);
    expect(publicSession).toBeTruthy();
    expect(JSON.stringify(publicSession)).not.toContain(
      registered.rawSessionToken,
    );
  });
});

describe("Phase 43 ensure endpoint retired", () => {
  it("ensure route module responds gone (import smoke)", async () => {
    const mod = await import("@/app/api/v1/auth/ensure/route");
    const res = await mod.POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("gone");
  });
});
