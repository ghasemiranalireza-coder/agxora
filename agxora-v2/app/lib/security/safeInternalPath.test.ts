import { describe, expect, it } from "vitest";
import {
  DEFAULT_SAFE_INTERNAL_PATH,
  buildSafeSameOriginRedirectUrl,
  resolveSafeInternalPath,
} from "./safeInternalPath";

const ORIGIN = "https://app.agxora.test";

describe("resolveSafeInternalPath", () => {
  it("accepts relative application paths", () => {
    expect(resolveSafeInternalPath("/dashboard")).toBe("/dashboard");
    expect(resolveSafeInternalPath("/dashboard/integrations")).toBe(
      "/dashboard/integrations",
    );
    expect(resolveSafeInternalPath("/dashboard/social")).toBe("/dashboard/social");
    expect(resolveSafeInternalPath("/agents?tab=social")).toBe(
      "/agents?tab=social",
    );
  });

  it("rejects absolute, protocol-relative, and script URLs", () => {
    expect(resolveSafeInternalPath("https://evil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("http://evil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("//evil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("javascript:alert(1)")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
  });

  it("rejects malformed input, backslashes, and encoded tricks", () => {
    expect(resolveSafeInternalPath("not a url")).toBe(DEFAULT_SAFE_INTERNAL_PATH);
    expect(resolveSafeInternalPath("")).toBe(DEFAULT_SAFE_INTERNAL_PATH);
    expect(resolveSafeInternalPath(null)).toBe(DEFAULT_SAFE_INTERNAL_PATH);
    expect(resolveSafeInternalPath({ path: "/dashboard" })).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("/\\evil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("/%5cevil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("/%2f%2fevil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("https:evil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
    expect(resolveSafeInternalPath("/dashboard\nhttps://evil.example")).toBe(
      DEFAULT_SAFE_INTERNAL_PATH,
    );
  });
});

describe("buildSafeSameOriginRedirectUrl", () => {
  it("stays on the request origin for valid paths", () => {
    const url = buildSafeSameOriginRedirectUrl(
      `${ORIGIN}/api/v1/callback`,
      "/dashboard/integrations",
    );
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/dashboard/integrations");
  });

  it("falls back instead of following an open redirect", () => {
    const url = buildSafeSameOriginRedirectUrl(
      `${ORIGIN}/api/v1/callback`,
      "https://evil.example/phish",
    );
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/dashboard/integrations");
    expect(url.href).not.toContain("evil.example");
  });
});
