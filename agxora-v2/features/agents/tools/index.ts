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

export const TOOL_CATALOG: readonly AgentToolDefinition[] = [
  {
    id: "crm",
    name: "CRM Tool",
    description: "Create/update customers and read account context.",
    module: "crm",
    sensitive: true,
  },
  {
    id: "projects",
    name: "Projects Tool",
    description: "Manage projects, tasks, and delivery status.",
    module: "projects",
    sensitive: false,
  },
  {
    id: "finance",
    name: "Finance Tool",
    description: "Invoices, balances, and finance summaries.",
    module: "finance",
    sensitive: true,
  },
  {
    id: "documents",
    name: "Documents Tool",
    description: "Read and summarize workspace documents.",
    module: "documents",
    sensitive: false,
  },
  {
    id: "workflow",
    name: "Workflow Tool",
    description: "Trigger and inspect automation workflows.",
    module: "automation",
    sensitive: false,
  },
  {
    id: "integration",
    name: "Integration Tool",
    description: "Call connected third-party connectors.",
    module: "integrations",
    sensitive: true,
  },
  {
    id: "email",
    name: "Email Tool",
    description: "Draft and queue outbound email.",
    module: "email",
    sensitive: true,
  },
  {
    id: "calendar",
    name: "Calendar Tool",
    description: "Schedule and inspect calendar events.",
    module: "calendar",
    sensitive: false,
  },
  {
    id: "search",
    name: "Search Tool",
    description: "Universal workspace search.",
    module: "search",
    sensitive: false,
  },
  {
    id: "notification",
    name: "Notification Tool",
    description: "Send in-app notifications.",
    module: "notifications",
    sensitive: false,
  },
  {
    id: "api",
    name: "API Tool",
    description: "Invoke internal API gateway routes.",
    module: "api",
    sensitive: true,
  },
  {
    id: "mcp",
    name: "MCP Tool",
    description: "Future Model Context Protocol server tools.",
    module: "mcp",
    sensitive: true,
    mcpReady: true,
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
