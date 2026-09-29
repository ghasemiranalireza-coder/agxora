import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY_CREATIVE_GENERATE_CLOSED } from "./legacyGenerateGate";

const generateSpy = vi.fn();

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => ({
      userId: "user_legacy_gate",
      email: "legacy-gate@example.test",
      name: "Legacy Gate",
      organizationId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      membershipId: "33333333-3333-4333-8333-333333333333",
      role: "OWNER" as const,
      sessionToken: "test-session",
    })),
  };
});

vi.mock("@/app/lib/creative/generate", () => ({
  generateCreativeImageForActor: (...args: unknown[]) => generateSpy(...args),
}));

describe("legacy creative generate governance lock", () => {
  beforeEach(() => {
    generateSpy.mockReset();
  });

  it("refuses the HTTP route before any provider or governed-execution work", async () => {
    const { POST } = await import("@/app/api/v1/agents/creative/generate/route");
    const response = await POST(
      new Request("http://localhost/api/v1/agents/creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeProjectId: "creative_bypass",
          organizationId: "99999999-9999-4999-8999-999999999999",
          approvalState: "APPROVED",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
    };

    expect(response.status).toBe(410);
    expect(payload).toEqual(LEGACY_CREATIVE_GENERATE_CLOSED);
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("does not import the provider entry from the route", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../api/v1/agents/creative/generate/route.ts"),
      "utf8",
    );
    expect(source).toContain("LEGACY_CREATIVE_GENERATE_CLOSED");
    expect(source).not.toContain("generateCreativeImageForActor");
    expect(source).not.toContain("getServerCreativeMediaProvider");
    expect(source).not.toContain("assertGovernedExecutionAllowed");
  });

  it("blocks the server function in production before a provider call", async () => {
    const { setServerCreativeImageProviderForTests } = await import(
      "./serverProvider"
    );
    const { generateCreativeImageForActor } = await vi.importActual<
      typeof import("./generate")
    >("./generate");
    const provider = {
      id: "openai",
      configured: true,
      modalities: ["image"] as const,
      generate: vi.fn(async () => ({
        available: true,
        generated: true,
        status: "completed" as const,
        providerId: "openai",
        assets: [],
      })),
    };
    setServerCreativeImageProviderForTests(provider);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await expect(
        generateCreativeImageForActor(
          {
            userId: "user_legacy_gate",
            email: "legacy-gate@example.test",
            name: "Legacy Gate",
            organizationId: "11111111-1111-4111-8111-111111111111",
            workspaceId: "22222222-2222-4222-8222-222222222222",
            membershipId: "33333333-3333-4333-8333-333333333333",
            role: "OWNER",
            sessionToken: "test-session",
          },
          { creativeProjectId: "creative_bypass" },
        ),
      ).rejects.toMatchObject({ status: 410, code: "forbidden" });
      expect(provider.generate).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
      setServerCreativeImageProviderForTests(null);
    }
  });
});
