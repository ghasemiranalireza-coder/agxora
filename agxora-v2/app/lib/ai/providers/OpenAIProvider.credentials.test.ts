import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI_SETTINGS } from "../AISettings";
import { OpenAIProvider } from "./OpenAIProvider";
import { OPENAI_CHAT_PATH, OPENAI_READINESS_PATH } from "../openaiApi";

function chatRequest() {
  return {
    modelId: "gpt-4.1",
    settings: DEFAULT_AI_SETTINGS,
    context: {
      organization: { organizationId: "org-actor", workspaceId: "ws-actor" },
      conversation: [],
      userPrompt: "Hello, how are you?",
    },
  };
}

describe("OpenAIProvider session credentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends cookies with chat requests and never attaches the API key", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          content: "Hello from OpenAI",
          providerId: "openai",
          modelId: "gpt-4.1-2025-04-14",
          finishReason: "stop",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider();
    await provider.chat(chatRequest());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OPENAI_CHAT_PATH);
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBeNull();
    const body = String(init.body ?? "");
    expect(body).not.toContain("AGXORA_OPENAI_API_KEY");
    expect(body).not.toMatch(/sk-[a-zA-Z0-9]/);
    const envKey = process.env.AGXORA_OPENAI_API_KEY;
    if (envKey) expect(body).not.toContain(envKey);
  });

  it("sends cookies with readiness requests", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ready: true,
          configured: true,
          message: "OpenAI is ready",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider();
    await provider.health();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OPENAI_READINESS_PATH);
    expect(init.credentials).toBe("include");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBeNull();
  });
});
