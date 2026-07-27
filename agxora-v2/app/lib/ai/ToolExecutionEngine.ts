/**
 * ToolExecutionEngine — tool-calling architecture only.
 * No fake business implementations — register real handlers later / MCP.
 */

import {
  createToolRegistry,
  defaultToolRegistry,
  type AIToolCall,
  type AIToolDefinition,
  type AIToolHandler,
  type AIToolRegistry,
  type AIToolResult,
} from "./AITools";

/** Reserved tool domains for future MCP / enterprise connectors. */
export const TOOL_DOMAINS = [
  "search",
  "calculator",
  "memory",
  "business_data",
  "documents",
  "calendar",
  "email",
  "crm",
  "erp",
  "analytics",
  "weather",
  "translation",
  "mcp",
] as const;

export type ToolDomain = (typeof TOOL_DOMAINS)[number];

export interface ToolDomainContract {
  readonly domain: ToolDomain;
  readonly description: string;
  readonly tools: readonly AIToolDefinition[];
}

/**
 * Architecture contracts — intentionally unimplemented.
 * Calling execute without a registered real handler returns ok:false.
 */
export const TOOL_DOMAIN_CONTRACTS: readonly ToolDomainContract[] = [
  {
    domain: "search",
    description: "Web and workspace search",
    tools: [
      {
        name: "workspace_search",
        description: "Search organization knowledge and files",
        parameters: [{ name: "query", type: "string", required: true }],
        category: "system",
      },
    ],
  },
  {
    domain: "calculator",
    description: "Numeric calculation",
    tools: [
      {
        name: "calculate",
        description: "Evaluate a mathematical expression",
        parameters: [{ name: "expression", type: "string", required: true }],
        category: "analytics",
      },
    ],
  },
  {
    domain: "memory",
    description: "Memory engine read/write",
    tools: [
      {
        name: "memory_query",
        description: "Query organization memory",
        parameters: [{ name: "query", type: "string", required: true }],
        category: "system",
      },
    ],
  },
  {
    domain: "business_data",
    description: "Business OS data access",
    tools: [
      {
        name: "get_business_profile",
        description: "Load active business profile",
        parameters: [],
        category: "system",
      },
    ],
  },
  {
    domain: "documents",
    description: "Document ingestion and retrieval",
    tools: [
      {
        name: "read_document",
        description: "Read a document by id",
        parameters: [{ name: "documentId", type: "string", required: true }],
        category: "files",
      },
    ],
  },
  {
    domain: "calendar",
    description: "Calendar and scheduling",
    tools: [
      {
        name: "list_events",
        description: "List calendar events",
        parameters: [{ name: "range", type: "string" }],
        category: "calendar",
      },
    ],
  },
  {
    domain: "email",
    description: "Email drafting and send",
    tools: [
      {
        name: "draft_email",
        description: "Draft an email",
        parameters: [
          { name: "to", type: "string", required: true },
          { name: "subject", type: "string", required: true },
          { name: "body", type: "string", required: true },
        ],
        category: "email",
      },
    ],
  },
  {
    domain: "crm",
    description: "CRM customer operations",
    tools: [
      {
        name: "crm_search",
        description: "Search CRM records",
        parameters: [{ name: "query", type: "string", required: true }],
        category: "crm",
      },
    ],
  },
  {
    domain: "erp",
    description: "ERP operations",
    tools: [
      {
        name: "erp_query",
        description: "Query ERP entities",
        parameters: [{ name: "entity", type: "string", required: true }],
        category: "system",
      },
    ],
  },
  {
    domain: "analytics",
    description: "Analytics and reporting",
    tools: [
      {
        name: "run_analytics",
        description: "Run an analytics query",
        parameters: [{ name: "metric", type: "string", required: true }],
        category: "analytics",
      },
    ],
  },
  {
    domain: "weather",
    description: "Weather data",
    tools: [
      {
        name: "get_weather",
        description: "Get weather for a location",
        parameters: [{ name: "location", type: "string", required: true }],
        category: "system",
      },
    ],
  },
  {
    domain: "translation",
    description: "Language translation",
    tools: [
      {
        name: "translate_text",
        description: "Translate text",
        parameters: [
          { name: "text", type: "string", required: true },
          { name: "targetLanguage", type: "string", required: true },
        ],
        category: "system",
      },
    ],
  },
  {
    domain: "mcp",
    description: "Future Model Context Protocol tools",
    tools: [
      {
        name: "mcp_invoke",
        description: "Invoke an MCP tool (future)",
        parameters: [
          { name: "server", type: "string", required: true },
          { name: "tool", type: "string", required: true },
        ],
        category: "system",
      },
    ],
  },
] as const;

export class ToolExecutionEngine {
  constructor(private readonly registry: AIToolRegistry = createToolRegistry()) {
    // Clear stub handlers from reserved tools — architecture only.
    for (const tool of this.registry.list()) {
      this.registry.unregister(tool.name);
      this.registry.register(tool, async (call) => ({
        toolCallId: call.id,
        name: call.name,
        ok: false,
        output: null,
        error: `Tool "${call.name}" has no real handler registered yet.`,
      }));
    }

    for (const contract of TOOL_DOMAIN_CONTRACTS) {
      for (const tool of contract.tools) {
        if (!this.registry.get(tool.name)) {
          this.registry.register(tool, async (call) => ({
            toolCallId: call.id,
            name: call.name,
            ok: false,
            output: null,
            error: `Architecture-only tool "${call.name}" (${contract.domain}). Register a real handler.`,
          }));
        }
      }
    }
  }

  register(definition: AIToolDefinition, handler: AIToolHandler): void {
    this.registry.register(definition, handler);
  }

  list(): readonly AIToolDefinition[] {
    return this.registry.list();
  }

  domains(): readonly ToolDomainContract[] {
    return TOOL_DOMAIN_CONTRACTS;
  }

  execute(call: AIToolCall, signal?: AbortSignal): Promise<AIToolResult> {
    return this.registry.execute(call, signal);
  }
}

export const toolExecutionEngine = new ToolExecutionEngine();
export { defaultToolRegistry };
