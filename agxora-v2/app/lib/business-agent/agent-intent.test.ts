import { describe, expect, it } from "vitest";
import {
  agentPlanMessage,
  detectAgentIntents,
  resolveAgentIntentResults,
} from "./agent-intent";
import { SAFE_PERMISSIONS } from "./catalog";

const gmailConnected = {
  provider: "email_gmail" as const,
  label: "Gmail / Google Workspace",
  implementationStatus: "oauth_ready" as const,
  connected: true,
  ...SAFE_PERMISSIONS,
};

const youtubeDisconnected = {
  provider: "youtube" as const,
  label: "YouTube",
  implementationStatus: "oauth_ready" as const,
  connected: false,
  ...SAFE_PERMISSIONS,
};

const linkedinCatalog = {
  provider: "linkedin" as const,
  label: "LinkedIn",
  implementationStatus: "not_implemented" as const,
  connected: false,
  ...SAFE_PERMISSIONS,
};

describe("core agent intent resolution", () => {
  it("maps email requests to Gmail read/draft without claiming send", () => {
    expect(detectAgentIntents("Summarize my latest customer emails")).toEqual([
      { kind: "gmail", provider: "email_gmail" },
    ]);
    const results = resolveAgentIntentResults({
      goal: "Draft a response to this customer.",
      integrations: [gmailConnected],
    });
    expect(results[0]?.tools).toContain("gmail.create_draft");
    expect(results[0]?.tools).not.toContain("gmail.send_message");
    expect(results[0]?.requiresApproval).toBe(true);
    expect(results[0]?.message).toMatch(/Gmail confirms/i);
  });

  it("maps YouTube campaign requests without claiming a publish", () => {
    expect(detectAgentIntents("Create a YouTube campaign.")).toEqual([
      { kind: "youtube", provider: "youtube" },
      { kind: "campaign", provider: null },
    ]);
    const results = resolveAgentIntentResults({
      goal: "Create a YouTube campaign.",
      integrations: [youtubeDisconnected],
    });
    expect(results.find((item) => item.kind === "youtube")?.code).toBe("not_connected");
    expect(results.find((item) => item.kind === "campaign")?.tools).toContain("plan_campaign");
  });

  it("maps LinkedIn posts to an honest unsupported state on main", () => {
    expect(detectAgentIntents("Prepare a LinkedIn post.")).toEqual([
      { kind: "linkedin", provider: "linkedin" },
    ]);
    const results = resolveAgentIntentResults({
      goal: "Prepare a LinkedIn post.",
      integrations: [linkedinCatalog],
    });
    expect(results[0]?.code).toBe("unsupported");
    expect(results[0]?.connected).toBe(false);
    expect(results[0]?.message).toMatch(/not available/i);
    expect(results[0]?.message).toMatch(/Nothing was published/i);
    expect(results[0]?.message).not.toMatch(/successfully published/i);
  });

  it("maps social campaign requests without selecting Instagram", () => {
    expect(detectAgentIntents("Create a social campaign for next week.")).toEqual([
      { kind: "campaign", provider: null },
    ]);
  });

  it("keeps Instagram unsupported and disconnected", () => {
    const results = resolveAgentIntentResults({
      goal: "Publish this to Instagram",
      integrations: [],
    });
    expect(results[0]?.code).toBe("unsupported");
    expect(results[0]?.connected).toBe(false);
    expect(agentPlanMessage(results)).not.toContain("access_token");
  });

  it("maps X and Twitter as unsupported without selecting a campaign", () => {
    expect(detectAgentIntents("Post this on Twitter")).toEqual([
      { kind: "unsupported_social", provider: "x" },
    ]);
    expect(detectAgentIntents("Post this on X tomorrow")).toEqual([
      { kind: "unsupported_social", provider: "x" },
    ]);
  });
});
