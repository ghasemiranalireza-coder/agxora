/**
 * Provider-based agent tool ecosystem (MCP-ready).
 */

import type {
  AgentToolDefinition,
  ToolHandler,
  ToolId,
  ToolInvocationContext,
  ToolInvocationResult,
} from "../types";
import {
  handleCampaignExecuteTool,
  handleCampaignPlanTool,
  handleCampaignReadinessTool,
  handleGrowthInsightsTool,
} from "../campaigns/handlers";
import { handleCrmTool } from "../crm/handlers";
import {
  handleSocialPublishTool,
  handleSocialScheduleTool,
  handleSocialTool,
} from "../social/handlers";
import {
  handleWebsitePublishTool,
  handleWebsiteTool,
} from "../website/handlers";
import {
  handleCreativeGenerateTool,
  handleCreativeTool,
} from "../creative/handlers";

export const TOOL_CATALOG: readonly AgentToolDefinition[] = [
  {
    id: "crm",
    name: "CRM Tool",
    description: "Create/update customers and read account context.",
    module: "crm",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "projects",
    name: "Projects Tool",
    description: "Manage projects, tasks, and delivery status.",
    module: "projects",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "finance",
    name: "Finance Tool",
    description: "Invoices, balances, and finance summaries.",
    module: "finance",
    sensitive: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "documents",
    name: "Documents Tool",
    description: "Read and summarize workspace documents.",
    module: "documents",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "workflow",
    name: "Workflow Tool",
    description: "Trigger and inspect automation workflows.",
    module: "automation",
    sensitive: false,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "integration",
    name: "Integration Tool",
    description: "Call connected third-party connectors.",
    module: "integrations",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "email",
    name: "Email Tool",
    description: "Draft and queue outbound email.",
    module: "email",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "calendar",
    name: "Calendar Tool",
    description: "Schedule and inspect calendar events.",
    module: "calendar",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "search",
    name: "Search Tool",
    description: "Universal workspace search.",
    module: "search",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "notification",
    name: "Notification Tool",
    description: "Send in-app notifications.",
    module: "notifications",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "api",
    name: "API Tool",
    description: "Invoke internal API gateway routes.",
    module: "api",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "mcp",
    name: "MCP Tool",
    description: "Future Model Context Protocol server tools.",
    module: "mcp",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
    mcpReady: true,
  },
  {
    id: "website",
    name: "Website Generation Tool",
    description: "Generate a structured website specification and preview.",
    module: "website",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        profileId: { type: "string", description: "Growth business profile id." },
        projectId: { type: "string", description: "Website project id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "website_publish",
    name: "Website Publish Tool",
    description: "Attempt website publication through the publisher adapter.",
    module: "website",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        projectId: { type: "string", description: "Website project id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "social",
    name: "Social Generation Tool",
    description: "Generate social strategy, calendar, and draft content.",
    module: "social",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        profileId: { type: "string", description: "Growth business profile id." },
        growthAction: { type: "string", description: "strategy, calendar, or content." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "social_publish",
    name: "Social Publish Tool",
    description: "Attempt social publishing through a platform adapter.",
    module: "social",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        contentId: { type: "string", description: "Social content id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "social_schedule",
    name: "Social Schedule Tool",
    description: "Attempt social scheduling through a platform adapter.",
    module: "social",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        contentId: { type: "string", description: "Social content id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "campaign_plan",
    name: "Campaign Plan Tool",
    description: "Create a structured campaign from growth website and social outputs.",
    module: "campaigns",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        profileId: { type: "string", description: "Growth business profile id." },
        objective: { type: "string", description: "Campaign objective." },
        offer: { type: "string", description: "Promoted service or offer." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "campaign_readiness",
    name: "Campaign Readiness Tool",
    description: "Evaluate campaign readiness and execution blockers.",
    module: "campaigns",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        campaignId: { type: "string", description: "Campaign id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "growth_insights",
    name: "Growth Insights Tool",
    description: "Generate deterministic growth priorities, risks, and next actions.",
    module: "campaigns",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        campaignId: { type: "string", description: "Campaign id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "campaign_execute",
    name: "Campaign Execute Tool",
    description: "Attempt campaign execution through existing publish adapters.",
    module: "campaigns",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        campaignId: { type: "string", description: "Campaign id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "creative",
    name: "Creative Planning Tool",
    description:
      "Create creative briefs, concepts, scripts, storyboards, and production plans.",
    module: "creative",
    sensitive: false,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        growthAction: {
          type: "string",
          description: "brief, script, storyboard, or plan.",
        },
        creativeId: { type: "string", description: "Creative project id." },
        creativeType: { type: "string", description: "VIDEO_AD, SOCIAL_VIDEO, …" },
        platform: { type: "string", description: "instagram_reels, tiktok, …" },
        customerRequest: { type: "string", description: "Customer creative request." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
  {
    id: "creative_generate",
    name: "Creative Generation Tool",
    description:
      "Execute approved creative media generation through a configured provider adapter.",
    module: "creative",
    sensitive: true,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", description: "Step title being executed." },
        goal: { type: "string", description: "Top-level goal for the task." },
        creativeId: { type: "string", description: "Creative project id." },
      },
      required: ["step", "goal"],
      additionalProperties: true,
    },
  },
] as const;

const handlers = new Map<ToolId, ToolHandler>();

function stub(id: ToolId): ToolHandler {
  return (ctx: ToolInvocationContext): ToolInvocationResult => {
    const started = Date.now();
    return {
      ok: true,
      output: {
        toolId: id,
        simulated: true,
        params: ctx.params,
        at: new Date().toISOString(),
      },
      durationMs: Date.now() - started,
    };
  };
}

for (const tool of TOOL_CATALOG) {
  handlers.set(tool.id, stub(tool.id));
}

export function registerToolHandler(id: ToolId, handler: ToolHandler): void {
  handlers.set(id, handler);
}

export function getToolDefinition(
  id: ToolId,
): AgentToolDefinition | undefined {
  return TOOL_CATALOG.find((t) => t.id === id);
}

export async function invokeTool(
  id: ToolId,
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const handler = handlers.get(id) ?? stub(id);
  return Promise.resolve(handler(ctx));
}

registerToolHandler("website", handleWebsiteTool);
registerToolHandler("website_publish", handleWebsitePublishTool);
registerToolHandler("social", handleSocialTool);
registerToolHandler("social_publish", handleSocialPublishTool);
registerToolHandler("social_schedule", handleSocialScheduleTool);
registerToolHandler("campaign_plan", handleCampaignPlanTool);
registerToolHandler("campaign_readiness", handleCampaignReadinessTool);
registerToolHandler("growth_insights", handleGrowthInsightsTool);
registerToolHandler("campaign_execute", handleCampaignExecuteTool);
registerToolHandler("crm", handleCrmTool);
registerToolHandler("creative", handleCreativeTool);
registerToolHandler("creative_generate", handleCreativeGenerateTool);
