import { describe, expect, it } from "vitest";
import { resolveAgentIntentResults } from "./agent-intent";
import {
  applyPlanApproval,
  applyPlanRejection,
  buildAgentRunPlan,
  planApprovalBlockReason,
  uniquePlanTools,
} from "./agent-run-plan";
import { SAFE_PERMISSIONS } from "./catalog";
import { redactSecrets } from "./redact";

const gmailConnected = {
  provider: "email_gmail" as const,
  label: "Gmail / Google Workspace",
  implementationStatus: "oauth_ready" as const,
  connected: true,
  ...SAFE_PERMISSIONS,
};

describe("agent run plan", () => {
  it("uses actor organization context and never selects send", () => {
    const capabilities = resolveAgentIntentResults({
      goal: "Draft a response to this customer. organizationId=other-org",
      integrations: [gmailConnected],
    });
    const plan = buildAgentRunPlan({
      organizationId: "org-actor",
      workspaceId: "ws-actor",
      policyMode: "SAFE",
      capabilities,
    });
    expect(plan.runStatus).toBe("WAITING_APPROVAL");
    expect(plan.requiresApproval).toBe(true);
    expect(plan.result.context).toEqual({
      organizationId: "org-actor",
      workspaceId: "ws-actor",
      policyMode: "SAFE",
    });
    expect(uniquePlanTools(capabilities)).not.toContain("gmail.send_message");
    expect(plan.result.toolsSelected).not.toContain("gmail.send_message");
    const wait = plan.steps.find((step) => step.name === "wait_for_approval");
    expect(wait?.status).toBe("WAITING_APPROVAL");
    expect(plan.steps.find((step) => step.name === "generate_content")?.output).toMatchObject({
      status: "not_generated",
    });
  });

  it("marks unsupported social plans complete without claiming a publish", () => {
    const capabilities = resolveAgentIntentResults({
      goal: "Publish this to Instagram",
      integrations: [],
    });
    const plan = buildAgentRunPlan({
      organizationId: "org-actor",
      workspaceId: "ws-actor",
      policyMode: "SAFE",
      capabilities,
    });
    expect(plan.runStatus).toBe("COMPLETED");
    expect(String(plan.result.message)).toMatch(/not available/i);
    expect(String(plan.result.message)).not.toMatch(/successfully published/i);
    expect(plan.steps.find((step) => step.name === "wait_for_approval")?.status).toBe(
      "COMPLETED",
    );
  });

  it("keeps YouTube campaigns waiting for approval and connection", () => {
    const capabilities = resolveAgentIntentResults({
      goal: "Create a YouTube campaign.",
      integrations: [
        {
          provider: "youtube",
          label: "YouTube",
          implementationStatus: "oauth_ready",
          connected: false,
          ...SAFE_PERMISSIONS,
        },
      ],
    });
    const plan = buildAgentRunPlan({
      organizationId: "org-actor",
      workspaceId: "ws-actor",
      policyMode: "SAFE",
      capabilities,
    });
    expect(plan.runStatus).toBe("WAITING_APPROVAL");
    expect(plan.result.youtube).toMatchObject({ publishBlockedUntilApproval: true });
    expect(plan.steps.find((step) => step.name === "build_campaign_strategy")?.output).toMatchObject({
      contentGenerated: false,
    });
  });

  it("approves a plan without starting provider execution", () => {
    const approved = applyPlanApproval({
      phase: "PLAN",
      access_token: "ya29.secret",
      message: "Waiting",
    });
    const redacted = redactSecrets(approved);
    expect(redacted.phase).toBe("PLAN_APPROVED");
    expect(redacted.providerExecution).toBe("not_started");
    expect(redacted.access_token).toBe("[redacted]");
    expect(String(redacted.message)).toMatch(/Nothing was published or sent/i);
    expect(redacted).not.toHaveProperty("externalId");
    expect(applyPlanRejection({ phase: "PLAN" }).phase).toBe("CANCELLED");
    expect(planApprovalBlockReason("WAITING_APPROVAL")).toBeNull();
    expect(planApprovalBlockReason("COMPLETED")).toMatch(/already complete/i);
  });
});
