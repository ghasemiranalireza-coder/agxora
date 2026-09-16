/**
 * Phase 45 — email delivery handoff contract tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deliverEmail,
  forceMemoryEmailFailure,
  listMemoryEmailOutbox,
  resetMemoryEmailOutbox,
  setEmailProviderForTests,
  memoryEmailProvider,
  noneEmailProvider,
  buildInvitationEmail,
  buildPasswordResetEmail,
  buildEmailVerificationEmail,
  redactActionUrl,
  getAppOrigin,
  getEmailConfig,
  getEmailProvider,
  createHttpEmailProvider,
} from "./index";
import { isHttpEmailDeliveryConfigured } from "./providerId";

const emailEnvKeys = [
  "AGXORA_EMAIL_PROVIDER",
  "AGXORA_EMAIL_FROM",
  "AGXORA_EMAIL_HTTP_URL",
  "AGXORA_EMAIL_HTTP_TOKEN",
  "NEXT_PUBLIC_AGXORA_SITE_URL",
  "AGXORA_APP_ORIGIN",
] as const;

afterEach(() => {
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  vi.unstubAllGlobals();
  for (const key of emailEnvKeys) {
    delete process.env[key];
  }
});

describe("Phase 45 email delivery contract", () => {
  it("returns not_configured when no provider is configured", async () => {
    setEmailProviderForTests(noneEmailProvider);
    const result = await deliverEmail(
      buildPasswordResetEmail({ to: "a@test.dev", rawToken: "secret-token" }),
    );
    expect(result.delivery).toBe("not_configured");
    expect(listMemoryEmailOutbox()).toHaveLength(0);
  });

  it("returns queued only after successful provider handoff", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    const result = await deliverEmail(
      buildInvitationEmail({
        to: "invitee@test.dev",
        organizationName: "Org",
        workspaceName: "WS",
        role: "MEMBER",
        rawToken: "invite-secret",
      }),
    );
    expect(result.delivery).toBe("queued");
    expect(listMemoryEmailOutbox()).toHaveLength(1);
    expect(listMemoryEmailOutbox()[0]?.kind).toBe("invitation");
    expect(listMemoryEmailOutbox()[0]?.text).toContain("invite-secret");
  });

  it("must not report queued when provider handoff fails", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    forceMemoryEmailFailure("boom");
    const result = await deliverEmail(
      buildEmailVerificationEmail({
        to: "user@test.dev",
        rawToken: "verify-secret",
      }),
    );
    expect(result.delivery).toBe("not_configured");
    expect(result.error).toBe("boom");
    expect(listMemoryEmailOutbox()).toHaveLength(0);
  });

  it("redacts tokens from action URLs for safe logs", () => {
    expect(
      redactActionUrl("https://agxora.app/invite/abcXYZ", "invitation"),
    ).toBe("https://agxora.app/invite/[redacted]");
    expect(
      redactActionUrl(
        "https://agxora.app/ownership-transfer/abcXYZ",
        "ownership_transfer",
      ),
    ).toBe("https://agxora.app/ownership-transfer/[redacted]");
    expect(
      redactActionUrl(
        "https://agxora.app/reset-password?token=abcXYZ",
        "password_reset",
      ),
    ).toBe("https://agxora.app/reset-password?token=[redacted]");
  });

  it("builds action URLs from NEXT_PUBLIC_AGXORA_SITE_URL", () => {
    process.env.NEXT_PUBLIC_AGXORA_SITE_URL = "https://agxora.de/";
    expect(getAppOrigin()).toBe("https://agxora.de");
    expect(
      buildEmailVerificationEmail({
        to: "user@test.dev",
        rawToken: "verify-secret",
      }).actionUrl,
    ).toBe("https://agxora.de/verify-email?token=verify-secret");
  });

  it("defaults From to noreply@agxora.de", () => {
    expect(getEmailConfig().from).toBe("noreply@agxora.de");
  });

  it("treats http without URL+token as not production-configured", () => {
    process.env.AGXORA_EMAIL_PROVIDER = "http";
    process.env.AGXORA_EMAIL_HTTP_URL = "https://email-worker.example/send";
    expect(isHttpEmailDeliveryConfigured()).toBe(false);
    expect(getEmailProvider().id).toBe("none");
    process.env.AGXORA_EMAIL_HTTP_TOKEN = "worker-token";
    expect(isHttpEmailDeliveryConfigured()).toBe(true);
    expect(getEmailProvider().id).toBe("http");
  });

  it("HTTP provider posts the existing payload with bearer auth", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "msg_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = createHttpEmailProvider({
      provider: "http",
      from: "noreply@agxora.de",
      httpUrl: "https://email-worker.example/send",
      httpToken: "worker-secret",
    });
    const result = await provider.send(
      buildPasswordResetEmail({ to: "a@test.dev", rawToken: "reset-secret" }),
    );
    expect(result).toEqual({ ok: true, providerMessageId: "msg_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://email-worker.example/send");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer worker-secret",
    );
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.from).toBe("noreply@agxora.de");
    expect(body.to).toBe("a@test.dev");
    expect(body.kind).toBe("password_reset");
    expect(body.actionUrl).toContain("reset-secret");
  });
});
