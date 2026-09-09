import { describe, expect, it } from "vitest";
import {
  integrationVisualStatus,
  isIntegrationConnectable,
} from "./integration-status";

describe("integration visual status", () => {
  it("never marks unimplemented providers as connected", () => {
    expect(
      integrationVisualStatus({
        connected: true,
        implementationStatus: "not_implemented",
      }),
    ).toBe("unsupported");
  });

  it("asks for authorization when Gmail/YouTube are ready but disconnected", () => {
    expect(
      integrationVisualStatus({
        connected: false,
        implementationStatus: "oauth_ready",
        category: "email",
      }),
    ).toBe("requires_authorization");
  });

  it("keeps connected Gmail with send off as permission-required, not fake send-ready", () => {
    expect(
      integrationVisualStatus({
        connected: true,
        implementationStatus: "oauth_ready",
        category: "email",
        canSendEmail: false,
      }),
    ).toBe("requires_permission");
  });

  it("does not offer connect for unimplemented providers", () => {
    expect(
      isIntegrationConnectable({
        connected: false,
        implementationStatus: "not_implemented",
      }),
    ).toBe(false);
  });
});
