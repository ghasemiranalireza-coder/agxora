/**
 * Phase 57.0 — First-customer production gate tests.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  collectFirstCustomerModeSnapshot,
  evaluateFirstCustomerProductionGate,
  type FirstCustomerModeSnapshot,
} from "@/app/lib/production/firstCustomerGate";
import { assertProdEnv } from "@/app/lib/production/env";
import { buildHealthPayload } from "@/app/lib/production/health";
import {
  isClientMintedOrganizationId,
  resolveOnboardingOrganizationId,
} from "@/app/lib/business/onboardingOrganization";

const VALID_PROD: FirstCustomerModeSnapshot = {
  runtime: "production",
  nodeEnv: "production",
  authRequired: true,
  authMode: "server",
  crmPersistence: "database",
  agentOsPersistence: "server",
  emailProvider: "http",
  useMocks: false,
};

const envKeys = [
  "NEXT_PUBLIC_AGXORA_ENV",
  "NODE_ENV",
  "AGXORA_AUTH_REQUIRED",
  "NEXT_PUBLIC_AGXORA_AUTH_MODE",
  "NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE",
  "NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE",
  "AGXORA_EMAIL_PROVIDER",
  "AGXORA_USE_MOCKS",
  "NEXT_PUBLIC_AGXORA_SITE_URL",
  "NEXT_PUBLIC_AGXORA_VERSION",
  "NEXT_PUBLIC_AGXORA_DATA_PROVIDER",
  "AGXORA_EMAIL_HTTP_TOKEN",
  "DATABASE_URL",
] as const;

const originalEnv: Record<string, string | undefined> = {};

function snapshotEnv(): void {
  for (const key of envKeys) {
    originalEnv[key] = process.env[key];
  }
}

function restoreEnv(): void {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnv();
});

snapshotEnv();

describe("Phase 57 first-customer production gate", () => {
  it("passes for coherent production configuration", () => {
    const result = evaluateFirstCustomerProductionGate(VALID_PROD);
    expect(result.enforced).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("does not enforce in development/demo", () => {
    const result = evaluateFirstCustomerProductionGate({
      ...VALID_PROD,
      runtime: "development",
      nodeEnv: "development",
      authRequired: false,
      authMode: "local",
      crmPersistence: "local",
      agentOsPersistence: "local",
      emailProvider: "none",
      useMocks: true,
    });
    expect(result.enforced).toBe(false);
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it.each([
    ["auth local", { authMode: "local" as const }, "auth_mode"],
    ["CRM local", { crmPersistence: "local" as const }, "crm_persistence"],
    [
      "Agent OS local",
      { agentOsPersistence: "local" as const },
      "agent_os_persistence",
    ],
    ["email none", { emailProvider: "none" as const }, "email_provider"],
    ["mocks true", { useMocks: true }, "mocks_enabled"],
    ["auth not required", { authRequired: false }, "auth_required"],
  ])("fails production when %s", (_label, patch, code) => {
    const result = evaluateFirstCustomerProductionGate({
      ...VALID_PROD,
      ...patch,
    });
    expect(result.ready).toBe(false);
    expect(result.issues.some((issue) => issue.code === code)).toBe(true);
  });

  it("rejects mixed Agent OS server + CRM local", () => {
    const result = evaluateFirstCustomerProductionGate({
      ...VALID_PROD,
      crmPersistence: "local",
    });
    expect(result.ready).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "crm_persistence" || issue.code === "mode_coherence",
      ),
    ).toBe(true);
  });

  it("rejects mixed CRM database + Agent OS local", () => {
    const result = evaluateFirstCustomerProductionGate({
      ...VALID_PROD,
      agentOsPersistence: "local",
    });
    expect(result.ready).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "agent_os_persistence" ||
          issue.code === "mode_coherence",
      ),
    ).toBe(true);
  });

  it("rejects mixed Agent OS server + auth local", () => {
    const result = evaluateFirstCustomerProductionGate({
      ...VALID_PROD,
      authMode: "local",
    });
    expect(result.ready).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "auth_mode" || issue.code === "mode_coherence",
      ),
    ).toBe(true);
  });
});

describe("Phase 57 health / readiness", () => {
  it("reports not_ready with issue codes and no secrets", () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.AGXORA_AUTH_REQUIRED = "false";
    process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE = "local";
    process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE = "local";
    process.env.NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE = "local";
    process.env.AGXORA_EMAIL_PROVIDER = "none";
    process.env.AGXORA_USE_MOCKS = "true";
    process.env.NEXT_PUBLIC_AGXORA_SITE_URL = "https://agxora.app";
    process.env.NEXT_PUBLIC_AGXORA_VERSION = "0.39.0";
    process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER = "rest";
    process.env.AGXORA_EMAIL_HTTP_TOKEN = "secret-token-should-not-leak";
    process.env.DATABASE_URL =
      "postgresql://user:password@localhost:5432/agxora";

    const payload = buildHealthPayload();
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("not_ready");
    expect(payload.productionGate.enforced).toBe(true);
    expect(payload.productionGate.ready).toBe(false);
    expect(payload.productionGate.emailConfigured).toBe(false);
    expect(payload.productionGate.issueCodes.length).toBeGreaterThan(0);
    expect(payload.productionGate.issueCodes).toContain("email_provider");

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("secret-token-should-not-leak");
    expect(serialized).not.toContain("postgresql://user:password");
    expect(serialized).not.toMatch(/password@/);
  });

  it("reports ready when production gate is coherent", () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.AGXORA_AUTH_REQUIRED = "true";
    process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE = "server";
    process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE = "database";
    process.env.NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE = "server";
    process.env.AGXORA_EMAIL_PROVIDER = "console";
    process.env.AGXORA_USE_MOCKS = "false";
    process.env.NEXT_PUBLIC_AGXORA_SITE_URL = "https://agxora.app";
    process.env.NEXT_PUBLIC_AGXORA_VERSION = "0.39.0";
    process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER = "rest";

    const payload = buildHealthPayload();
    expect(payload.productionGate.ready).toBe(true);
    expect(payload.productionGate.emailConfigured).toBe(true);
    expect(payload.status).not.toBe("not_ready");
    expect(assertProdEnv().some((w) => /EMAIL_PROVIDER/.test(w))).toBe(false);
  });

  it("email provider none fails production readiness", () => {
    const result = evaluateFirstCustomerProductionGate({
      ...VALID_PROD,
      emailProvider: "none",
    });
    expect(result.ready).toBe(false);
    expect(result.issues.some((i) => i.code === "email_provider")).toBe(true);
  });
});

describe("Phase 57 onboarding organization binding", () => {
  it("uses authenticated membership organizationId", () => {
    const resolved = resolveOnboardingOrganizationId({
      authOrganizationId: "org_server_membership",
      requireAuthenticatedOrganization: true,
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.organizationId).toBe("org_server_membership");
      expect(resolved.source).toBe("auth");
      expect(isClientMintedOrganizationId(resolved.organizationId)).toBe(false);
    }
  });

  it("prefers auth org when session org diverges", () => {
    const resolved = resolveOnboardingOrganizationId({
      sessionOrganizationId: "org_client_divergent",
      authOrganizationId: "org_actor_a",
      requireAuthenticatedOrganization: true,
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.organizationId).toBe("org_actor_a");
      expect(resolved.source).toBe("auth");
    }
  });

  it("refuses to mint org_randomUUID in authenticated mode", () => {
    const resolved = resolveOnboardingOrganizationId({
      requireAuthenticatedOrganization: true,
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.code).toBe("missing_authenticated_organization");
    }
  });

  it("allows local demo mint when not requiring auth org", () => {
    const resolved = resolveOnboardingOrganizationId({
      requireAuthenticatedOrganization: false,
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.source).toBe("local_demo");
      expect(resolved.organizationId.startsWith("org_")).toBe(true);
    }
  });

  it("cross-org: actor A org is not replaced by actor B session org", () => {
    const actorA = resolveOnboardingOrganizationId({
      authOrganizationId: "org_actor_a",
      sessionOrganizationId: "org_actor_b",
      requireAuthenticatedOrganization: true,
    });
    expect(actorA.ok).toBe(true);
    if (actorA.ok) {
      expect(actorA.organizationId).toBe("org_actor_a");
      expect(actorA.organizationId).not.toBe("org_actor_b");
    }
  });
});

describe("Phase 57 mode snapshot helper", () => {
  it("collects overrides without leaking secrets", () => {
    const snap = collectFirstCustomerModeSnapshot({
      runtime: "development",
      emailProvider: "none",
    });
    expect(snap.runtime).toBe("development");
    expect(snap.emailProvider).toBe("none");
    expect(JSON.stringify(snap)).not.toMatch(/postgresql:\/\//);
  });
});
