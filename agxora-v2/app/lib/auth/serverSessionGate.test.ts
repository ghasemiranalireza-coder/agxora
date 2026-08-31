import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLoginRedirectPath,
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
});
