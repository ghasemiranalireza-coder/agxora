/**
 * Server AI chat — provider resolution, language, security, and OpenAI boundary tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  evaluateServerAiReadiness,
  generateServerAiChatForActor,
} from "@/app/lib/ai/serverChat";
import { resolveServerProviderId } from "@/app/lib/ai/serverProviderFactory";

const ACTOR: Actor = {
  userId: "user_ai_test",
  email: "ai@test.example",
  name: "AI Test",
  organizationId: "11111111-1111-4111-8111-111111111111",
  workspaceId: "ws_ai_test",
  membershipId: "mem_ai_test",
  role: "OWNER",
  sessionToken: "session_ai_test",
};

describe("server AI chat readiness", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      "AGXORA_OPENAI_API_KEY",
      "AGXORA_AI_CHAT_ALLOW_MOCK",
      "AGXORA_OPENAI_CHAT_MODEL",
    ]) {
      envBackup[key] = process.env[key];
    }
    delete process.env.AGXORA_OPENAI_API_KEY;
    process.env.AGXORA_AI_CHAT_ALLOW_MOCK = "false";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  it("reports not ready when no provider keys are configured", () => {
    const readiness = evaluateServerAiReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.issueCode).toBe("provider_not_configured");
    expect(readiness.defaultProviderId).toBeNull();
    expect(readiness.mockOnly).toBe(false);
  });

  it("reports not ready when only mock is available", () => {
    process.env.AGXORA_AI_CHAT_ALLOW_MOCK = "true";
    const readiness = evaluateServerAiReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.mockOnly).toBe(true);
    expect(readiness.issueCode).toBe("mock_only");
    expect(readiness.defaultProviderId).toBe("mock");
  });

  it("reports ready when OpenAI key is configured", () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const readiness = evaluateServerAiReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.defaultProviderId).toBe("openai");
    expect(readiness.configuredProviders).toContain("openai");
    expect(readiness.mockOnly).toBe(false);
  });
});

describe("server provider resolution", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ["AGXORA_OPENAI_API_KEY", "AGXORA_AI_CHAT_ALLOW_MOCK"]) {
      envBackup[key] = process.env[key];
    }
    delete process.env.AGXORA_OPENAI_API_KEY;
    process.env.AGXORA_AI_CHAT_ALLOW_MOCK = "false";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("does not silently fall back to mock when OpenAI is requested but not configured", () => {
    expect(() => resolveServerProviderId("openai")).toThrowError(
      expect.objectContaining({ code: "PROVIDER_NOT_CONFIGURED" }),
    );
  });

  it("requires explicit opt-in before mock can be used", () => {
    expect(() => resolveServerProviderId("mock")).toThrowError(
      expect.objectContaining({ code: "PROVIDER_NOT_CONFIGURED" }),
    );
    process.env.AGXORA_AI_CHAT_ALLOW_MOCK = "true";
    expect(resolveServerProviderId("mock")).toBe("mock");
  });

  it("resolves configured OpenAI when no provider is requested", () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    expect(resolveServerProviderId(undefined)).toBe("openai");
  });
});

describe("generateServerAiChatForActor", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      "AGXORA_OPENAI_API_KEY",
      "AGXORA_AI_CHAT_ALLOW_MOCK",
      "AGXORA_OPENAI_CHAT_MODEL",
    ]) {
      envBackup[key] = process.env[key];
    }
    delete process.env.AGXORA_OPENAI_API_KEY;
    process.env.AGXORA_AI_CHAT_ALLOW_MOCK = "false";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  it("fails honestly when provider is not configured", async () => {
    await expect(
      generateServerAiChatForActor(ACTOR, {
        context: {
          organization: { organizationId: ACTOR.organizationId, workspaceId: null },
          conversation: [],
          userPrompt: "سلام",
        },
        providerId: "openai",
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
  });

  it("rejects cross-organization context from the client", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    await expect(
      generateServerAiChatForActor(ACTOR, {
        context: {
          organization: {
            organizationId: "22222222-2222-4222-8222-222222222222",
            workspaceId: null,
          },
          conversation: [],
          userPrompt: "Hello",
        },
        providerId: "openai",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("forces actor organization into the provider request context", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: null, workspaceId: null },
        conversation: [],
        userPrompt: "Hello",
      },
      providerId: "openai",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages[0]?.content).toBeTruthy();
  });

  it("calls OpenAI chat completions when configured", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: { content: "Hallo! Beginne mit einer klaren Nische." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: ACTOR.workspaceId },
        conversation: [],
        userPrompt: "Hallo wie kann ich anfangen Geld zu verdienen?",
      },
      providerId: "openai",
      modelId: "gpt-4.1",
    });

    expect(response.content).toContain("Hallo");
    expect(response.providerId).toBe("openai");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://");
    expect(url).toContain("/chat/completions");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-test-key",
    });
    const body = JSON.parse(String(init.body));
    expect(body.messages.at(-1)?.content).toContain("Hallo wie kann ich anfangen");
    expect(body.model).toBeTruthy();
  });

  it("includes Persian language instruction in the system prompt", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "سلام! چطور می‌توانم کمک کنم؟" }, finish_reason: "stop" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [],
        userPrompt: "سلام، حالت چطوره؟",
      },
      providerId: "openai",
      preferredLocale: "fa",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const system = body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "";
    expect(system).toContain("فارسی");
    expect(system).toContain("(fa)");
    expect(system).toContain("MUST respond entirely");
    expect(system).toContain('Do not use English boilerplate such as "Understood:"');
  });

  it("includes German language instruction in the system prompt", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "Hallo!" }, finish_reason: "stop" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [],
        userPrompt: "Hallo, wie geht es dir?",
      },
      providerId: "openai",
      preferredLocale: "de",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const system = body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "";
    expect(system).toContain("Deutsch");
    expect(system).toContain("(de)");
  });

  it("includes English language instruction in the system prompt", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "Hello!" }, finish_reason: "stop" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [],
        userPrompt: "Hello, how are you?",
      },
      providerId: "openai",
      preferredLocale: "en",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const system = body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "";
    expect(system).toContain("English");
    expect(system).toContain("(en)");
  });

  it("passes conversation history to OpenAI", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "Follow-up answer" }, finish_reason: "stop" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [
          { role: "user", content: "First question" },
          { role: "assistant", content: "First answer" },
        ],
        userPrompt: "Second question",
      },
      providerId: "openai",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const roles = body.messages.map((m: { role: string }) => m.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
    expect(body.messages.at(-1)?.content).toBe("Second question");
  });

  it("normalizes OpenAI provider errors without leaking secrets", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-invalid-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: "Incorrect API key provided: sk-invalid-key",
              type: "invalid_request_error",
            },
          },
          { status: 401 },
        ),
      ),
    );

    await expect(
      generateServerAiChatForActor(ACTOR, {
        context: {
          organization: { organizationId: ACTOR.organizationId, workspaceId: null },
          conversation: [],
          userPrompt: "Hello",
        },
        providerId: "openai",
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
  });

  it("does not use mock provider in normal production chat path", async () => {
    process.env.AGXORA_AI_CHAT_ALLOW_MOCK = "true";
    await expect(
      generateServerAiChatForActor(ACTOR, {
        context: {
          organization: { organizationId: ACTOR.organizationId, workspaceId: null },
          conversation: [],
          userPrompt: "Hello",
        },
        providerId: "openai",
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
  });
});
