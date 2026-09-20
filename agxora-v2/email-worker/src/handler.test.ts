import { afterEach, describe, expect, it, vi } from "vitest";
import { handleEmailWorkerRequest } from "./handler";

const TOKEN = "worker-test-token";
const ACTION_URL = "https://agxora.de/verify-email?token=one-time-secret";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    from: "noreply@agxora.de",
    to: "customer@example.com",
    subject: "Verify your AGXORA email",
    text: `Confirm: ${ACTION_URL}`,
    kind: "email_verification",
    actionUrl: ACTION_URL,
    ...overrides,
  };
}

function postSend(
  body: unknown,
  options?: {
    readonly token?: string | null;
    readonly env?: NodeJS.ProcessEnv;
    readonly fetchImpl?: typeof fetch;
    readonly contentLength?: string;
  },
): Promise<Response> {
  const headers = new Headers({ "content-type": "application/json" });
  if (options?.token !== null) {
    headers.set("authorization", `Bearer ${options?.token ?? TOKEN}`);
  }
  const encoded = JSON.stringify(body);
  if (options?.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  return handleEmailWorkerRequest(
    new Request("http://email-worker.test/send", {
      method: "POST",
      headers,
      body: encoded,
    }),
    {
      env: {
        EMAIL_WORKER_TOKEN: TOKEN,
        EMAIL_WORKER_ESP: "resend",
        RESEND_API_KEY: "re_test_not_a_real_key",
        EMAIL_WORKER_ALLOWED_FROM: "noreply@agxora.de",
        ...options?.env,
      },
      fetch: options?.fetchImpl ?? (async () => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 })),
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AGXORA email worker", () => {
  it("rejects missing bearer token", async () => {
    const response = await postSend(payload(), { token: null });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
  });

  it("rejects invalid bearer token", async () => {
    const response = await postSend(payload(), { token: "wrong-token" });
    expect(response.status).toBe(401);
  });

  it("rejects missing worker token configuration", async () => {
    const response = await postSend(payload(), { env: { EMAIL_WORKER_TOKEN: "" } });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "worker_not_configured",
    });
  });

  it("validates required fields and recipient email", async () => {
    const missing = await postSend({ ...payload(), to: "" });
    expect(missing.status).toBe(400);
    const bad = await postSend({ ...payload(), to: "not-an-email" });
    expect(bad.status).toBe(400);
    await expect(bad.json()).resolves.toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects disallowed From and unknown kinds", async () => {
    const from = await postSend({ ...payload(), from: "other@agxora.de" });
    expect(from.status).toBe(400);
    await expect(from.json()).resolves.toEqual({ ok: false, error: "from_not_allowed" });
    const kind = await postSend({ ...payload(), kind: "marketing" });
    expect(kind.status).toBe(400);
    await expect(kind.json()).resolves.toEqual({ ok: false, error: "invalid_kind" });
  });

  it("rejects non-http(s) action URLs", async () => {
    const response = await postSend({
      ...payload(),
      actionUrl: "javascript:alert(1)",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid_action_url",
    });
  });

  it("rejects oversized payloads", async () => {
    const response = await postSend(payload(), {
      env: { EMAIL_WORKER_MAX_BYTES: "32" },
      contentLength: "99999",
    });
    expect(response.status).toBe(413);
  });

  it("forwards to Resend without logging secrets or action tokens", async () => {
    const logs: unknown[] = [];
    let capturedAuth: string | null = null;
    const fetchImpl: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("authorization");
      expect(String(input)).toBe("https://api.resend.com/emails");
      const body = JSON.parse(String(init?.body)) as {
        from: string;
        to: string[];
        subject: string;
        text: string;
      };
      expect(body.from).toBe("noreply@agxora.de");
      expect(body.to).toEqual(["customer@example.com"]);
      expect(body.text).toContain(ACTION_URL);
      return new Response(JSON.stringify({ id: "re_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const response = await handleEmailWorkerRequest(
      new Request("http://email-worker.test/send", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload()),
      }),
      {
        env: {
          EMAIL_WORKER_TOKEN: TOKEN,
          EMAIL_WORKER_ESP: "resend",
          RESEND_API_KEY: "re_test_not_a_real_key",
          EMAIL_WORKER_ALLOWED_FROM: "noreply@agxora.de",
        },
        fetch: fetchImpl,
        log: (event) => logs.push(event),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, id: "re_123" });
    expect(capturedAuth).toBe("Bearer re_test_not_a_real_key");
    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain("re_test_not_a_real_key");
    expect(serialized).not.toContain("one-time-secret");
    expect(serialized).not.toContain(ACTION_URL);
    expect(serialized).not.toContain("customer@example.com");
  });

  it("forwards to Postmark when EMAIL_WORKER_ESP=postmark", async () => {
    let url = "";
    let token: string | null = null;
    const fetchImpl: typeof fetch = async (input, init) => {
      url = String(input);
      token = new Headers(init?.headers).get("x-postmark-server-token");
      return new Response(JSON.stringify({ MessageID: "pm_1" }), { status: 200 });
    };
    const response = await postSend(payload(), {
      env: {
        EMAIL_WORKER_ESP: "postmark",
        POSTMARK_SERVER_TOKEN: "pm_test_not_a_real_key",
        RESEND_API_KEY: "",
      },
      fetchImpl,
    });
    expect(response.status).toBe(200);
    expect(url).toBe("https://api.postmarkapp.com/email");
    expect(token).toBe("pm_test_not_a_real_key");
  });

  it("does not expose ESP errors or keys in the client response", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ message: "invalid API key re_leaked" }), {
        status: 401,
      });
    const response = await postSend(payload(), { fetchImpl });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("re_leaked");
    expect(JSON.stringify(body)).not.toContain("re_test_not_a_real_key");
    expect(body).toEqual({ ok: false, error: "esp_rejected" });
  });

  it("serves a secret-free health response", async () => {
    const response = await handleEmailWorkerRequest(
      new Request("http://email-worker.test/health"),
      {
        env: {
          EMAIL_WORKER_TOKEN: TOKEN,
          RESEND_API_KEY: "re_test_not_a_real_key",
        },
        fetch,
      },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, service: "agxora-email-worker" });
    expect(JSON.stringify(body)).not.toContain("re_test");
    expect(JSON.stringify(body)).not.toContain(TOKEN);
  });

  it("accepts invitation, password_reset, email_verification, and ownership_transfer", async () => {
    const kinds = [
      "invitation",
      "password_reset",
      "email_verification",
      "ownership_transfer",
    ] as const;
    for (const kind of kinds) {
      const response = await postSend(
        payload({
          kind,
          actionUrl: `https://agxora.de/${kind}?token=one-time-secret`,
        }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, id: "msg_1" });
    }
  });

  it("returns 503 when Resend is selected but RESEND_API_KEY is missing", async () => {
    const response = await postSend(payload(), {
      env: { RESEND_API_KEY: "" },
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "esp_not_configured",
    });
  });
});
