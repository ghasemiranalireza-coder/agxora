/**
 * RC P0 — production fail-closed env + readiness.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  assertProdEnv,
  getEnvSnapshot,
  isAuthRequired,
  isProductionEmailConfigured,
  isProductionRuntime,
} from "./env";
import { getAuthMode } from "@/app/lib/auth/mode";
import { buildLivenessPayload, buildReadinessPayload } from "./health";

const KEYS = [
  "NEXT_PUBLIC_AGXORA_ENV",
  "NODE_ENV",
  "AGXORA_AUTH_REQUIRED",
  "NEXT_PUBLIC_AGXORA_AUTH_MODE",
  "AGXORA_USE_MOCKS",
  "NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE",
  "NEXT_PUBLIC_AGXORA_DATA_PROVIDER",
  "AGXORA_EMAIL_PROVIDER",
  "AGXORA_EMAIL_HTTP_URL",
  "NEXT_PUBLIC_AGXORA_SITE_URL",
  "NEXT_PUBLIC_AGXORA_VERSION",
] as const;

const saved: Record<string, string | undefined> = {};

function snapshotEnv(): void {
  for (const key of KEYS) saved[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function applyValidProductionEnv(): void {
  process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
  process.env.AGXORA_AUTH_REQUIRED = "true";
  process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE = "server";
  process.env.AGXORA_USE_MOCKS = "false";
  process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE = "database";
  process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER = "rest";
  process.env.AGXORA_EMAIL_PROVIDER = "http";
  process.env.AGXORA_EMAIL_HTTP_URL = "https://mail-worker.example/v1/send";
  process.env.NEXT_PUBLIC_AGXORA_SITE_URL = "https://agxora.app";
  process.env.NEXT_PUBLIC_AGXORA_VERSION = "0.39.0";
}

beforeEachSnapshot();

function beforeEachSnapshot(): void {
  snapshotEnv();
}

afterEach(() => {
  restoreEnv();
});

describe("production fail-closed defaults", () => {
  it("does not infer local auth from CRM persistence=local", () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "development";
    delete process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE;
    process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE = "local";
    expect(getAuthMode()).toBe("server");
  });

  it("forces server auth in production even if AUTH_MODE=local", () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE = "local";
    expect(isProductionRuntime()).toBe(true);
    expect(getAuthMode()).toBe("server");
  });

  it("forces auth required in production even if AGXORA_AUTH_REQUIRED=false", () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.AGXORA_AUTH_REQUIRED = "false";
    expect(isAuthRequired()).toBe(true);
    expect(getEnvSnapshot().authRequired).toBe(true);
  });

  it("treats missing email HTTP worker as not production-ready", () => {
    process.env.AGXORA_EMAIL_PROVIDER = "none";
    delete process.env.AGXORA_EMAIL_HTTP_URL;
    expect(isProductionEmailConfigured()).toBe(false);
    process.env.AGXORA_EMAIL_PROVIDER = "http";
    process.env.AGXORA_EMAIL_HTTP_URL = "https://mail-worker.example/v1/send";
    expect(isProductionEmailConfigured()).toBe(true);
  });
});

describe("liveness vs readiness", () => {
  it("liveness is always ok", () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.AGXORA_USE_MOCKS = "true";
    const live = buildLivenessPayload();
    expect(live.ok).toBe(true);
    expect(live.status).toBe("alive");
  });

  it("invalid production env → readiness fails", async () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.AGXORA_AUTH_REQUIRED = "false";
    process.env.AGXORA_USE_MOCKS = "true";
    process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE = "local";
    process.env.NEXT_PUBLIC_AGXORA_DATA_PROVIDER = "local";
    process.env.AGXORA_EMAIL_PROVIDER = "none";
    delete process.env.AGXORA_EMAIL_HTTP_URL;
    process.env.NEXT_PUBLIC_AGXORA_SITE_URL = "https://agxora.app";
    process.env.NEXT_PUBLIC_AGXORA_VERSION = "0.39.0";

    const issues = assertProdEnv();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((row) => row.includes("EMAIL"))).toBe(true);
    expect(issues.some((row) => row.includes("MOCKS") || row.includes("mocks"))).toBe(
      true,
    );

    const ready = await buildReadinessPayload();
    expect(ready.ok).toBe(false);
    expect(ready.status).toBe("not_ready");
  });

  it("valid production env → readiness passes when the database answers", async () => {
    applyValidProductionEnv();
    const issues = assertProdEnv();
    expect(issues).toEqual([]);
    const ready = await buildReadinessPayload();
    expect(ready.ok).toBe(true);
    expect(ready.status).toBe("ready");
    expect(ready.database).toBe("ok");
  });
});
