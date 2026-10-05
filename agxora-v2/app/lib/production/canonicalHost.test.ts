import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalAliasRedirects,
  canonicalRedirectLocation,
  PRODUCTION_CANONICAL_ORIGIN,
} from "./canonicalHost";

describe("canonical production host", () => {
  it("redirects the vercel alias root to agxora.de", () => {
    expect(canonicalRedirectLocation("agxora.vercel.app", "/")).toBe(
      "https://agxora.de/",
    );
  });

  it("preserves the pathname", () => {
    expect(canonicalRedirectLocation("agxora.vercel.app", "/login")).toBe(
      "https://agxora.de/login",
    );
    expect(canonicalRedirectLocation("agxora.vercel.app", "/dashboard")).toBe(
      "https://agxora.de/dashboard",
    );
  });

  it("preserves the query string", () => {
    expect(
      canonicalRedirectLocation(
        "agxora.vercel.app",
        "/login",
        "?next=%2Fdashboard",
      ),
    ).toBe("https://agxora.de/login?next=%2Fdashboard");
  });

  it("does not redirect the canonical host", () => {
    expect(canonicalRedirectLocation("agxora.de", "/dashboard")).toBeNull();
  });

  it("wires a permanent host redirect in next.config", () => {
    const rules = canonicalAliasRedirects();
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/",
          destination: `${PRODUCTION_CANONICAL_ORIGIN}/`,
          permanent: true,
          has: [{ type: "host", value: "agxora.vercel.app" }],
        }),
        expect.objectContaining({
          source: "/:path*",
          destination: `${PRODUCTION_CANONICAL_ORIGIN}/:path*`,
          permanent: true,
          has: [{ type: "host", value: "agxora.vercel.app" }],
        }),
      ]),
    );
    const config = readFileSync(
      new URL("../../../next.config.ts", import.meta.url),
      "utf8",
    );
    expect(config).toContain("canonicalAliasRedirects()");
  });

  it("keeps the agent os-state fetch relative and server-authenticated", () => {
    const repository = readFileSync(
      new URL("../../../features/agents/repositories/index.ts", import.meta.url),
      "utf8",
    );
    expect(repository).toContain('const DEFAULT_API_PATH = "/api/v1/agents/os-state"');
    expect(repository).toContain('credentials: "include"');
    const route = readFileSync(
      new URL("../../api/v1/agents/os-state/route.ts", import.meta.url),
      "utf8",
    );
    expect(route).toContain("requireCurrentActor()");
  });

  it("does not share the session cookie across hosts", () => {
    const cookies = readFileSync(
      new URL("../auth/server/cookies.ts", import.meta.url),
      "utf8",
    );
    expect(cookies).toContain('sameSite: "lax"');
    expect(cookies).toContain('path: "/"');
    expect(cookies).not.toMatch(/\bdomain\s*:/);
  });
});
