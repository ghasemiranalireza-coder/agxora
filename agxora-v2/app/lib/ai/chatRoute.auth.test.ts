import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import { isMockAiFallbackText } from "./openaiApi";

const actorMocks = vi.hoisted(() => ({
  actor: null as Actor | null,
}));

const openaiMocks = vi.hoisted(() => ({
  completeOpenAIChat: vi.fn(),
  streamOpenAIChat: vi.fn(),
}));

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => {
      if (!actorMocks.actor) {
        throw new actual.PersistenceError(
          "unauthorized",
          "Authentication required",
        );
      }
      return actorMocks.actor;
    }),
  };
});

vi.mock("@/app/lib/security/rate-limit", () => ({
  rateLimitResponse: vi.fn(async () => null),
}));

vi.mock("@/app/lib/ai/openaiChat", () => ({
  completeOpenAIChat: openaiMocks.completeOpenAIChat,
  streamOpenAIChat: openaiMocks.streamOpenAIChat,
}));

import { POST } from "@/app/api/v1/ai/chat/route";
import { GET as getReadiness } from "@/app/api/v1/ai/readiness/route";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";

const actor: Actor = {
  userId: "user-ai-auth",
  email: "owner-a@agxora.dev",
  name: "Owner A",
  organizationId: "org-actor",
  workspaceId: "ws-actor",
  membershipId: "mem-actor",
  role: "OWNER",
  sessionToken: "test-session",
};

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toMatch(/sk-[a-zA-Z0-9]/);
  expect(serialized).not.toContain("AGXORA_OPENAI_API_KEY");
  const envKey = process.env.AGXORA_OPENAI_API_KEY;
  if (envKey) {
    expect(serialized).not.toContain(envKey);
  }
}

function chatBody(organizationId: string | null = null) {
  return {
    context: {
      organization: { organizationId, workspaceId: null },
      conversation: [],
      userPrompt: "Hello, how are you?",
    },
  };
}

function postChat(body: unknown) {
  return POST(
    new Request("http://localhost/api/v1/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("AI chat and readiness authentication", () => {
  beforeEach(() => {
    actorMocks.actor = null;
    openaiMocks.completeOpenAIChat.mockReset();
    openaiMocks.streamOpenAIChat.mockReset();
    vi.mocked(rateLimitResponse).mockReset();
    vi.mocked(rateLimitResponse).mockResolvedValue(null);
    openaiMocks.completeOpenAIChat.mockResolvedValue({
      content: "I am doing well, thank you.",
      providerId: "openai",
      modelId: "gpt-4.1-2025-04-14",
      finishReason: "stop",
    });
  });

  it("rejects unauthenticated chat with the structured 401", async () => {
    const response = await postChat(chatBody());
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("unauthorized");
    expect(payload.message).toBe("Authentication required");
    expect(openaiMocks.completeOpenAIChat).not.toHaveBeenCalled();
    expect(rateLimitResponse).not.toHaveBeenCalled();
    assertNoSecretLeak(payload);
  });

  it("rejects unauthenticated readiness with the structured 401", async () => {
    const response = await getReadiness();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("unauthorized");
    expect(openaiMocks.completeOpenAIChat).not.toHaveBeenCalled();
    assertNoSecretLeak(payload);
  });

  it("authenticated chat reaches the OpenAI provider with actor org", async () => {
    actorMocks.actor = actor;
    const response = await postChat(chatBody());
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.providerId).toBe("openai");
    expect(payload.modelId).toBe("gpt-4.1-2025-04-14");
    expect(typeof payload.content).toBe("string");
    expect(isMockAiFallbackText(String(payload.content))).toBe(false);
    expect(String(payload.content)).not.toMatch(/^Understood:/);
    expect(openaiMocks.completeOpenAIChat).toHaveBeenCalledTimes(1);
    const input = openaiMocks.completeOpenAIChat.mock.calls[0]?.[0] as {
      context: { organization: { organizationId: string; workspaceId: string } };
    };
    expect(input.context.organization.organizationId).toBe("org-actor");
    expect(input.context.organization.workspaceId).toBe("ws-actor");
    expect(rateLimitResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        policyId: "ai.chat",
        userId: "user-ai-auth",
      }),
    );
    assertNoSecretLeak(payload);
  });

  it("rejects cross-organization chat without calling OpenAI", async () => {
    actorMocks.actor = actor;
    const response = await postChat(chatBody("org-other"));
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("forbidden");
    expect(openaiMocks.completeOpenAIChat).not.toHaveBeenCalled();
    assertNoSecretLeak(payload);
  });

  it("does not fall back to MockAIProvider", async () => {
    actorMocks.actor = actor;
    const response = await postChat(chatBody());
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload.providerId).toBe("openai");
    expect(String(payload.modelId).toLowerCase()).not.toContain("mock");
    expect(isMockAiFallbackText(String(payload.content))).toBe(false);
    expect(openaiMocks.completeOpenAIChat).toHaveBeenCalled();
    expect(openaiMocks.streamOpenAIChat).not.toHaveBeenCalled();
  });

  it("authenticated readiness stays secret-free and org-scoped", async () => {
    actorMocks.actor = actor;
    const response = await getReadiness();
    const payload = (await response.json()) as Record<string, unknown>;
    expect([200, 503]).toContain(response.status);
    expect(payload.organizationId).toBe("org-actor");
    expect(payload.providerId).toBe("openai");
    assertNoSecretLeak(payload);
  });

  it("stops at the existing rate limiter before OpenAI", async () => {
    actorMocks.actor = actor;
    vi.mocked(rateLimitResponse).mockResolvedValue(
      NextResponse.json(
        {
          ok: false,
          code: "rate_limited",
          message: "Too many requests. Try again later.",
        },
        { status: 429 },
      ),
    );
    const response = await postChat(chatBody());
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(openaiMocks.completeOpenAIChat).not.toHaveBeenCalled();
    assertNoSecretLeak(payload);
  });
});
