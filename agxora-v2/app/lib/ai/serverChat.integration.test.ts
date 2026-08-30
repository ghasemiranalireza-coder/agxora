/**
 * Optional live OpenAI integration — runs only when AGXORA_OPENAI_API_KEY is set.
 * Never logs secrets.
 */

import { describe, expect, it } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import { generateServerAiChatForActor } from "@/app/lib/ai/serverChat";

const LIVE = Boolean(process.env.AGXORA_OPENAI_API_KEY?.trim());

const ACTOR: Actor = {
  userId: "user_ai_live",
  email: "ai-live@test.example",
  name: "AI Live",
  organizationId: "11111111-1111-4111-8111-111111111111",
  workspaceId: "ws_ai_live",
  membershipId: "mem_ai_live",
  role: "OWNER",
  sessionToken: "session_ai_live",
};

function looksPersian(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function looksGerman(text: string): boolean {
  return /\b(ich|du|Sie|und|ist|nicht|wie|Hallo|Geld|können|können|Unternehmen)\b/i.test(text);
}

describe.runIf(LIVE)("live OpenAI chat integration", () => {
  it("responds in Persian when Persian locale is selected", async () => {
    const response = await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [],
        userPrompt: "سلام، حالت چطوره؟",
      },
      providerId: "openai",
      preferredLocale: "fa",
      modelId: "gpt-4o-mini",
      settings: { maxTokens: 256 },
    });

    expect(response.content.trim().length).toBeGreaterThan(10);
    expect(response.content).not.toMatch(/^Understood:/);
    expect(looksPersian(response.content)).toBe(true);
    expect(response.providerId).toBe("openai");
  }, 30_000);

  it("responds in German when German locale is selected", async () => {
    const response = await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [],
        userPrompt: "Hallo, wie geht es dir?",
      },
      providerId: "openai",
      preferredLocale: "de",
      modelId: "gpt-4o-mini",
      settings: { maxTokens: 256 },
    });

    expect(response.content.trim().length).toBeGreaterThan(10);
    expect(response.content).not.toMatch(/^Understood:/);
    expect(looksGerman(response.content)).toBe(true);
    expect(response.providerId).toBe("openai");
  }, 30_000);

  it("responds in English when English locale is selected", async () => {
    const response = await generateServerAiChatForActor(ACTOR, {
      context: {
        organization: { organizationId: ACTOR.organizationId, workspaceId: null },
        conversation: [],
        userPrompt: "Hello, how are you?",
      },
      providerId: "openai",
      preferredLocale: "en",
      modelId: "gpt-4o-mini",
      settings: { maxTokens: 256 },
    });

    expect(response.content.trim().length).toBeGreaterThan(10);
    expect(response.content).not.toMatch(/^Understood:/);
    expect(response.content).toMatch(/\b(hello|hi|how|you|well|good|help)\b/i);
    expect(response.providerId).toBe("openai");
  }, 30_000);
});

describe.runIf(!LIVE)("live OpenAI chat integration", () => {
  it("skipped because AGXORA_OPENAI_API_KEY is not configured", () => {
    expect(LIVE).toBe(false);
  });
});
