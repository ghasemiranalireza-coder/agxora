/**
 * Phase 57.1 — client readiness + org authority tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchProductionReadinessFromHealth,
  parseProductionReadinessFromHealth,
} from "@/app/lib/production/clientReadiness";
import { buildHealthPayload } from "@/app/lib/production/health";
import { resolveAgentsOrganizationId } from "@/features/agents/hooks/resolveAgentsOrganizationId";

const envKeys = [
  "NEXT_PUBLIC_AGXORA_ENV",
  "NODE_ENV",
  "NEXT_PUBLIC_AGXORA_AUTH_MODE",
  "NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE",
  "NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE",
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
  vi.restoreAllMocks();
});

snapshotEnv();

describe("Phase 57.1 client production readiness", () => {
  it("parses readiness from health payload without server-only env vars", () => {
    const parsed = parseProductionReadinessFromHealth({
      productionGate: {
        enforced: true,
        ready: false,
        issueCodes: ["email_provider", "auth_required"],
      },
    });
    expect(parsed.enforced).toBe(true);
    expect(parsed.ready).toBe(false);
    expect(parsed.issueCodes).toEqual(["email_provider", "auth_required"]);
  });

  it("fetchProductionReadinessFromHealth matches buildHealthPayload readiness", async () => {
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

    const health = buildHealthPayload();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => health,
    });

    const client = await fetchProductionReadinessFromHealth(fetchImpl);
    expect(client.enforced).toBe(health.productionGate.enforced);
    expect(client.ready).toBe(health.productionGate.ready);
    expect(client.issueCodes).toEqual(health.productionGate.issueCodes);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("does not read AGXORA_AUTH_REQUIRED or AGXORA_USE_MOCKS in client parser", () => {
    delete process.env.AGXORA_AUTH_REQUIRED;
    delete process.env.AGXORA_USE_MOCKS;
    delete process.env.AGXORA_EMAIL_PROVIDER;

    const parsed = parseProductionReadinessFromHealth({
      productionGate: { enforced: false, ready: true, issueCodes: [] },
    });
    expect(parsed.ready).toBe(true);
    expect(parsed.issueCodes).toEqual([]);
  });
});

describe("Phase 57.1 agents organization authority", () => {
  it("auth membership organization wins over divergent OrganizationProvider org", () => {
    const orgId = resolveAgentsOrganizationId({
      sessionOrganizationId: "org_client_divergent",
      authOrganizationId: "org_auth_membership",
      serverAuthMode: true,
    });
    expect(orgId).toBe("org_auth_membership");
  });

  it("preserves local OrganizationProvider priority when not in server auth mode", () => {
    const orgId = resolveAgentsOrganizationId({
      sessionOrganizationId: "org_local_session",
      authOrganizationId: "org_auth_membership",
      serverAuthMode: false,
    });
    expect(orgId).toBe("org_local_session");
  });

  it("falls back to local default org in demo mode", () => {
    expect(
      resolveAgentsOrganizationId({
        serverAuthMode: false,
      }),
    ).toBe("org_local_default");
  });
});
