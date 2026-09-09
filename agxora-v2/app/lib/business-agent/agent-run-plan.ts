/**
 * Pure AgentRun plan construction. Actor org/workspace are supplied by the server.
 * This module does not call providers and never marks content as generated.
 */

import { AGENT_PLAN_STEPS } from "./catalog";
import {
  agentPlanMessage,
  type AgentCapabilityResult,
} from "./agent-intent";

const GMAIL_PLAN_GUIDANCE =
  "Gmail/Google Workspace uses official OAuth only. Read and draft may run when Gmail is connected and permitted. Sending is disabled by default, blocked until the user enables send permission, blocked by SAFE MODE, and requires explicit approval. Never claim an email was sent unless Gmail confirmed the send. Never include OAuth tokens, refresh tokens, client secrets, or access tokens in replies.";

export type AgentRunPlanStatus =
  | "PENDING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "RUNNING"
  | "FAILED"
  | "CANCELLED";

export type PlannedAgentStep = {
  readonly name: (typeof AGENT_PLAN_STEPS)[number];
  readonly status: AgentRunPlanStatus;
  readonly output: Record<string, unknown>;
};

export type AgentRunPlan = {
  readonly runStatus: AgentRunPlanStatus;
  readonly requiresApproval: boolean;
  readonly result: Record<string, unknown>;
  readonly steps: readonly PlannedAgentStep[];
};

const SIDE_EFFECT_TOOLS = new Set([
  "gmail.send_message",
  "send_email",
  "publish_content",
  "schedule_content",
]);

export function uniquePlanTools(
  capabilities: readonly AgentCapabilityResult[],
): string[] {
  const tools: string[] = [];
  for (const item of capabilities) {
    for (const name of item.tools) {
      if (SIDE_EFFECT_TOOLS.has(name)) continue;
      if (!tools.includes(name)) tools.push(name);
    }
  }
  return tools;
}

export function isUnsupportedOnlyPlan(
  capabilities: readonly AgentCapabilityResult[],
): boolean {
  return (
    capabilities.length > 0 &&
    capabilities.every((item) => item.code === "unsupported")
  );
}

function stepOutput(
  name: (typeof AGENT_PLAN_STEPS)[number],
  input: {
    readonly organizationId: string;
    readonly workspaceId: string;
    readonly policyMode: string;
    readonly capabilities: readonly AgentCapabilityResult[];
    readonly requiresApproval: boolean;
    readonly unsupportedOnly: boolean;
  },
): Record<string, unknown> {
  if (name === "analyze_business_context") {
    return {
      status: "planned",
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      policyMode: input.policyMode,
      note: "Uses the signed-in organization and workspace. Client-supplied organization or workspace IDs are ignored.",
    };
  }
  if (name === "analyze_connected_channels") {
    return {
      status: "planned",
      channels: input.capabilities.map((item) => ({
        kind: item.kind,
        provider: item.provider,
        connected: item.connected,
        implemented: item.implemented,
        code: item.code,
      })),
    };
  }
  if (name === "build_campaign_strategy") {
    const campaign = input.capabilities.find((item) => item.kind === "campaign");
    if (!campaign) {
      return {
        status: "skipped",
        note: "No campaign was requested. Nothing was scheduled.",
      };
    }
    return {
      status: "planned",
      tools: campaign.tools,
      note: campaign.message,
      contentGenerated: false,
    };
  }
  if (name === "generate_content" || name === "create_drafts") {
    return {
      status: "not_generated",
      note: "Content generation is not implemented yet. No drafts were created.",
    };
  }
  if (name === "wait_for_approval") {
    return {
      status: input.unsupportedOnly ? "not_required" : "waiting_approval",
      requiresApproval: input.requiresApproval,
      note: input.unsupportedOnly
        ? "Nothing was published. The requested provider is not available."
        : "Waiting for your approval. Nothing was published or sent.",
    };
  }
  if (name === "publish_approved_content") {
    return {
      status: "blocked",
      note: "Nothing is published until you approve a supported provider action and that provider confirms it.",
    };
  }
  if (name === "verify_publication") {
    return {
      status: "blocked",
      note: "Waiting for official provider confirmation. AGXORA will not claim success without it.",
    };
  }
  return {
    status: "blocked",
    note: "Results stay empty until a supported provider confirms an approved action.",
  };
}

export function buildAgentRunPlan(input: {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly policyMode: string;
  readonly capabilities: readonly AgentCapabilityResult[];
}): AgentRunPlan {
  const capabilities = input.capabilities;
  const unsupportedOnly = isUnsupportedOnlyPlan(capabilities);
  const requiresApproval =
    !unsupportedOnly &&
    (capabilities.length === 0 ||
      capabilities.some((item) => item.requiresApproval));
  const gmailCapability = capabilities.find((item) => item.kind === "gmail");
  const youtubeCapability = capabilities.find((item) => item.kind === "youtube");
  const linkedinCapability = capabilities.find((item) => item.kind === "linkedin");
  const runStatus: AgentRunPlanStatus = unsupportedOnly
    ? "COMPLETED"
    : "WAITING_APPROVAL";

  const steps: PlannedAgentStep[] = AGENT_PLAN_STEPS.map((name) => {
    let status: AgentRunPlanStatus = "PENDING";
    if (name === "wait_for_approval") {
      status = unsupportedOnly ? "COMPLETED" : "WAITING_APPROVAL";
    } else if (
      unsupportedOnly &&
      (name === "publish_approved_content" ||
        name === "verify_publication" ||
        name === "report_results")
    ) {
      status = "COMPLETED";
    }
    return {
      name,
      status,
      output: stepOutput(name, {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        policyMode: input.policyMode,
        capabilities,
        requiresApproval,
        unsupportedOnly,
      }),
    };
  });

  return {
    runStatus,
    requiresApproval,
    result: {
      phase: unsupportedOnly ? "UNSUPPORTED" : "PLAN",
      understood: capabilities.map((item) => item.kind),
      context: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        policyMode: input.policyMode,
      },
      capabilities,
      toolsSelected: uniquePlanTools(capabilities),
      blocked: capabilities
        .filter((item) => item.code !== "ok" && item.code !== "approval_required")
        .map((item) => ({ code: item.code, message: item.message })),
      requiresApproval,
      message: agentPlanMessage(capabilities),
      gmail: gmailCapability
        ? {
            tools: gmailCapability.tools.filter((name) => name.startsWith("gmail.")),
            sendBlockedUntilApproval: true,
            guidance: GMAIL_PLAN_GUIDANCE,
          }
        : undefined,
      youtube: youtubeCapability
        ? {
            tools: youtubeCapability.tools,
            publishBlockedUntilApproval: true,
          }
        : undefined,
      linkedin: linkedinCapability
        ? {
            implemented: linkedinCapability.implemented,
            connected: linkedinCapability.connected,
            code: linkedinCapability.code,
          }
        : undefined,
    },
    steps,
  };
}

export function applyPlanApproval(
  result: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...result,
    phase: "PLAN_APPROVED",
    requiresApproval: false,
    providerExecution: "not_started",
    message:
      "Plan approved. Nothing was published or sent. Provider execution still requires a supported channel, permission, and official provider confirmation.",
  };
}

export function applyPlanRejection(
  result: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...result,
    phase: "CANCELLED",
    requiresApproval: false,
    message: "Plan rejected. Nothing was published or sent.",
  };
}

export function planApprovalBlockReason(status: string): string | null {
  if (status === "WAITING_APPROVAL") return null;
  if (status === "CANCELLED") return "This plan was already rejected.";
  if (status === "COMPLETED") return "This plan is already complete. Nothing further was published.";
  if (status === "RUNNING") return "This plan was already approved. Provider actions still need confirmation.";
  return "This plan cannot be approved in its current status.";
}
