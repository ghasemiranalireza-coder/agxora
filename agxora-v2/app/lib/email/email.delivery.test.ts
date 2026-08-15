/**
 * Phase 45 — email delivery handoff contract tests.
 */

import { afterEach, describe, expect, it } from "vitest";
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
} from "./index";

afterEach(() => {
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  delete process.env.AGXORA_EMAIL_PROVIDER;
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
