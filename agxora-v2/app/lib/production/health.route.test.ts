/**
 * RC P0 — liveness vs readiness HTTP handlers.
 */

import { afterEach, describe, expect, it } from "vitest";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as readyGet } from "@/app/api/ready/route";

const KEYS = [
  "NEXT_PUBLIC_AGXORA_ENV",
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

for (const key of KEYS) saved[key] = process.env[key];

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

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

describe("health and ready HTTP handlers", () => {
  it("liveness stays HTTP 200 even when production config is degraded", async () => {
    process.env.NEXT_PUBLIC_AGXORA_ENV = "production";
    process.env.AGXORA_USE_MOCKS = "true";
    process.env.AGXORA_EMAIL_PROVIDER = "none";
    const response = await healthGet();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; status: string };
    expect(body.ok).toBe(true);
    expect(body.status).toBe("alive");
  });

  it("readiness returns HTTP 503 when production email provider is missing", async () => {
    applyValidProductionEnv();
    process.env.AGXORA_EMAIL_PROVIDER = "none";
    delete process.env.AGXORA_EMAIL_HTTP_URL;
    const response = await readyGet();
    expect(response.status).toBe(503);
    const body = (await response.json()) as {
      ok: boolean;
      status: string;
      issues: string[];
    };
    expect(body.ok).toBe(false);
    expect(body.status).toBe("not_ready");
    expect(body.issues.some((row) => row.includes("EMAIL"))).toBe(true);
  });

  it("readiness returns HTTP 200 for a valid production env with a live database", async () => {
    applyValidProductionEnv();
    const response = await readyGet();
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      status: string;
      database: string;
    };
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ready");
    expect(body.database).toBe("ok");
  });
});
