import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLoginRedirectPath,
  destinationAfterLiveSession,
  isServerSessionRequired,
  resolveProxySession,
} from "./serverSessionGate";

describe("serverSessionGate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires the server session in production even when AGXORA_AUTH_REQUIRED is unset", () => {
    expect(
      isServerSessionRequired({
        NODE_ENV: "production",
        AGXORA_AUTH_REQUIRED: undefined,
      }),
    ).toBe(true);
  });

  it("requires the server session when AGXORA_AUTH_REQUIRED=true in development", () => {
    expect(
      isServerSessionRequired({
        NODE_ENV: "development",
        AGXORA_AUTH_REQUIRED: "true",
      }),
    ).toBe(true);
  });

  it("does not hard-require server session for local demo", () => {
    expect(
      isServerSessionRequired({
        NODE_ENV: "development",
        AGXORA_AUTH_REQUIRED: "false",
      }),
    ).toBe(false);
  });

  it("reads NODE_ENV and AGXORA_AUTH_REQUIRED as direct properties", () => {
    const source = readFileSync(
      new URL("./serverSessionGate.ts", import.meta.url),
      "utf8",
    );
    const start = source.indexOf("function readServerSessionEnv");
    const end = source.indexOf("export function resolveProxySession");
    const gate = source.slice(start, end);
    expect(gate).toContain("process.env.NODE_ENV");
    expect(gate).toContain("process.env.AGXORA_AUTH_REQUIRED");
    expect(gate).not.toMatch(/=\s*process\.env\b/);
  });

  it("requires a server session by default in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGXORA_AUTH_REQUIRED", "");
    expect(isServerSessionRequired()).toBe(true);
  });

  it("requires a server session by default when AGXORA_AUTH_REQUIRED is true", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AGXORA_AUTH_REQUIRED", "true");
    expect(isServerSessionRequired()).toBe(true);
  });

  it("does not require a server session by default for a local demo", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AGXORA_AUTH_REQUIRED", "false");
    expect(isServerSessionRequired()).toBe(false);
  });

  it("ignores the local demo cookie in production", () => {
    const resolved = resolveProxySession({
      serverSession: null,
      localSession: "demo-local-session",
      nodeEnv: "production",
    });
    expect(resolved.hasSession).toBe(false);
    expect(resolved.hasServerSession).toBe(false);
    expect(resolved.source).toBeNull();
  });

  it("accepts the httpOnly server cookie in production", () => {
    const resolved = resolveProxySession({
      serverSession: "server-token",
      localSession: "demo-local-session",
      nodeEnv: "production",
    });
    expect(resolved.hasServerSession).toBe(true);
    expect(resolved.hasSession).toBe(true);
    expect(resolved.source).toBe("server-session");
  });

  it("still accepts the local demo cookie outside production", () => {
    const resolved = resolveProxySession({
      serverSession: null,
      localSession: "demo-local-session",
      nodeEnv: "development",
      authRequired: "false",
    });
    expect(resolved.hasSession).toBe(true);
    expect(resolved.hasServerSession).toBe(false);
    expect(resolved.source).toBe("session");
  });

  it("builds a same-origin login redirect that preserves the next path", () => {
    expect(buildLoginRedirectPath("/dashboard/ai")).toBe(
      "/login?next=%2Fdashboard%2Fai",
    );
    expect(buildLoginRedirectPath("//evil.example")).toBe(
      "/login?next=%2Fdashboard",
    );
  });

  it("sends a live session to the safe next path or the dashboard", () => {
    expect(destinationAfterLiveSession("/dashboard")).toBe("/dashboard");
    expect(destinationAfterLiveSession("/login?next=%2Fdashboard")).toBe(
      "/login?next=%2Fdashboard",
    );
    expect(destinationAfterLiveSession(null)).toBe("/dashboard");
    expect(destinationAfterLiveSession("//evil.example")).toBe("/dashboard");
  });
});
