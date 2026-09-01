import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("removes token-like keys and bearer prefixes", () => {
    const redacted = redactSecrets({
      action: "publish",
      accessToken: "secret-value",
      nested: { refresh_token: "abc", ok: true },
      header: "Bearer abc",
    });
    expect(redacted.accessToken).toBe("[redacted]");
    expect(redacted.nested.refresh_token).toBe("[redacted]");
    expect(redacted.nested.ok).toBe(true);
    expect(redacted.header).toBe("[redacted]");
    expect(redacted.action).toBe("publish");
  });
});
