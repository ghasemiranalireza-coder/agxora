import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "./sessionStore";
import { SERVER_SESSION_COOKIE } from "@/app/lib/tenancy/sessionCookie";
import { proxy } from "../../../proxy";

function requestWithCookies(
  pathname: string,
  cookies: Record<string, string> = {},
): NextRequest {
  const headers = new Headers();
  const serialized = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (serialized) headers.set("cookie", serialized);
  return new NextRequest(`https://agxora.vercel.app${pathname}`, { headers });
}

describe("production dashboard proxy session gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects production /dashboard without agxora.server.session to login", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGXORA_AUTH_REQUIRED", "false");
    const response = proxy(
      requestWithCookies("/dashboard/ai", {
        [AUTH_SESSION_COOKIE]: "local-demo-cookie",
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("next=");
    expect(location).toContain("dashboard");
  });

  it("allows production /dashboard when the httpOnly server cookie is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = proxy(
      requestWithCookies("/dashboard/ai", {
        [SERVER_SESSION_COOKIE]: "server-session-token",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-agxora-auth")).toBe("server-session");
  });

  it("does not treat a local demo cookie as production authentication", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = proxy(
      requestWithCookies("/dashboard", {
        [AUTH_SESSION_COOKIE]: "local-demo-cookie",
      }),
    );
    expect(response.headers.get("location") ?? "").toContain("/login");
  });
});
