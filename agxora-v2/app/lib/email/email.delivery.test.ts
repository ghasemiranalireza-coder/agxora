/**
 * Phase 45 — email delivery handoff contract tests.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  deliverEmail,
  forceMemoryEmailFailure,
  getEmailProvider,
  isEmailDeliveryConfigured,
  listMemoryEmailOutbox,
  resetMemoryEmailOutbox,
  setEmailProviderForTests,
  memoryEmailProvider,
  noneEmailProvider,
  buildInvitationEmail,
  buildPasswordResetEmail,
  buildEmailVerificationEmail,
  redactActionUrl,
} from "./index";
import { createHttpEmailProvider } from "./providers/http";

afterEach(() => {
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  delete process.env.AGXORA_EMAIL_PROVIDER;
  delete process.env.AGXORA_EMAIL_HTTP_URL;
  delete process.env.AGXORA_EMAIL_HTTP_TOKEN;
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
});

describe("RC P0 email provider configuration", () => {
  it("treats missing provider as not configured", () => {
    process.env.AGXORA_EMAIL_PROVIDER = "none";
    delete process.env.AGXORA_EMAIL_HTTP_URL;
    expect(isEmailDeliveryConfigured()).toBe(false);
    expect(getEmailProvider().id).toBe("none");
    expect(getEmailProvider().configured).toBe(false);
  });

  it("treats http provider without URL as not configured", () => {
    process.env.AGXORA_EMAIL_PROVIDER = "http";
    delete process.env.AGXORA_EMAIL_HTTP_URL;
    expect(isEmailDeliveryConfigured()).toBe(false);
    expect(getEmailProvider().configured).toBe(false);
  });

  it("delivers reset and verification mail through a configured HTTP provider", async () => {
    const calls: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body ?? "{}")));
      return new Response(JSON.stringify({ id: "msg-1" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const provider = createHttpEmailProvider({
        provider: "http",
        from: "noreply@agxora.app",
        httpUrl: "https://mail-worker.example/v1/send",
        httpToken: "test-token",
      });
      expect(provider.configured).toBe(true);
      setEmailProviderForTests(provider);

      const reset = await deliverEmail(
        buildPasswordResetEmail({ to: "reset@test.dev", rawToken: "reset-secret" }),
      );
      const verify = await deliverEmail(
        buildEmailVerificationEmail({
          to: "verify@test.dev",
          rawToken: "verify-secret",
        }),
      );
      expect(reset.delivery).toBe("queued");
      expect(verify.delivery).toBe("queued");
      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatchObject({
        to: "reset@test.dev",
        kind: "password_reset",
      });
      expect(calls[1]).toMatchObject({
        to: "verify@test.dev",
        kind: "email_verification",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
