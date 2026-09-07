import { describe, expect, it } from "vitest";
import {
  AGENT_PLAN_STEPS,
  INTEGRATION_CATALOG,
  SAFE_PERMISSIONS,
  isIntegrationProviderId,
} from "./catalog";
import { AGENT_TOOL_CATALOG } from "./tools";
import { permissionGranted } from "./authorize";

describe("business-agent catalog", () => {
  it("defaults to SAFE permissions", () => {
    expect(SAFE_PERMISSIONS.canPublish).toBe(false);
    expect(SAFE_PERMISSIONS.canSendEmail).toBe(false);
    expect(SAFE_PERMISSIONS.canCreateDraft).toBe(true);
  });

  it("marks YouTube and Gmail as oauth_ready in Phase 2", () => {
    const youtube = INTEGRATION_CATALOG.find((item) => item.provider === "youtube");
    const gmail = INTEGRATION_CATALOG.find((item) => item.provider === "email_gmail");
    expect(youtube?.implementationStatus).toBe("oauth_ready");
    expect(youtube?.capabilities).toEqual(["read", "create_draft", "publish"]);
    expect(youtube?.capabilities).not.toContain("schedule");
    expect(youtube?.capabilities).not.toContain("analytics");
    expect(gmail?.implementationStatus).toBe("oauth_ready");
    expect(
      INTEGRATION_CATALOG.filter(
        (item) => item.provider !== "youtube" && item.provider !== "email_gmail",
      ).every((item) => item.implementationStatus === "not_implemented"),
    ).toBe(true);
  });

  it("treats publish and send as side effects", () => {
    expect(AGENT_TOOL_CATALOG.find((tool) => tool.name === "plan_campaign")?.sideEffect).toBe(
      false,
    );
    expect(AGENT_TOOL_CATALOG.find((tool) => tool.name === "publish_content")?.sideEffect).toBe(
      true,
    );
    expect(AGENT_TOOL_CATALOG.find((tool) => tool.name === "send_email")?.sideEffect).toBe(true);
    expect(AGENT_TOOL_CATALOG.find((tool) => tool.name === "gmail.send_message")?.sideEffect).toBe(
      true,
    );
    expect(permissionGranted(SAFE_PERMISSIONS, "publish")).toBe(false);
    expect(isIntegrationProviderId("instagram")).toBe(true);
    expect(isIntegrationProviderId("unknown")).toBe(false);
    expect(AGENT_PLAN_STEPS).toContain("wait_for_approval");
  });
});
