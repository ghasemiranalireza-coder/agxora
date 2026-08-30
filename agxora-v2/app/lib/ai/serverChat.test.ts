/**
 * Server AI chat — provider resolution and OpenAI network boundary tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  evaluateServerAiReadiness,
  generateServerAiChatForActor,
} from "@/app/lib/ai/serverChat";

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
  });

  it("reports ready when OpenAI key is configured", () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const readiness = evaluateServerAiReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.defaultProviderId).toBe("openai");
    expect(readiness.configuredProviders).toContain("openai");
  });

  it("calls OpenAI chat completions when configured", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-key";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "Hallo! Beginne mit einer klaren Nische." }, finish_reason: "stop" }],
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
    expect(url).toContain("/chat/completions");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-test-key",
    });
    const body = JSON.parse(String(init.body));
    expect(body.messages.at(-1)?.content).toContain("Hallo wie kann ich anfangen");
    expect(body.model).toBeTruthy();
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
});
