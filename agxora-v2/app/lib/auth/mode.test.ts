import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultAuthAdapter } from "./createDefaultAuthAdapter";
import { getAuthMode } from "./mode";
import { serverAuthAdapter } from "./ServerAuthAdapter";

describe("getAuthMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forces server mode in production even if NEXT_PUBLIC_AGXORA_AUTH_MODE=local", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_AGXORA_AUTH_MODE", "local");
    vi.stubEnv("NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE", "local");
    expect(getAuthMode()).toBe("server");
    expect(createDefaultAuthAdapter()).toBe(serverAuthAdapter);
  });

  it("keeps explicit local mode in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_AGXORA_AUTH_MODE", "local");
    expect(getAuthMode()).toBe("local");
  });

  it("uses explicit server mode in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_AGXORA_AUTH_MODE", "server");
    expect(getAuthMode()).toBe("server");
  });
});
