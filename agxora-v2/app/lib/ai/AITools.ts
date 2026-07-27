/**
 * Generic tool-calling framework — MCP-ready later.
 */

export type AIToolName = string;

export interface AIToolParameter {
  readonly name: string;
  readonly type: "string" | "number" | "boolean" | "object" | "array";
  readonly description?: string;
  readonly required?: boolean;
}

export interface AIToolDefinition {
  readonly name: AIToolName;
  readonly description: string;
  readonly parameters: readonly AIToolParameter[];
  readonly category?:
    | "crm"
    | "finance"
    | "files"
    | "tasks"
    | "calendar"
    | "email"
    | "analytics"
    | "system";
}

export interface AIToolCall {
  readonly id: string;
  readonly name: AIToolName;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface AIToolResult {
  readonly toolCallId: string;
  readonly name: AIToolName;
  readonly ok: boolean;
  readonly output: unknown;
  readonly error?: string;
}

export type AIToolHandler = (
  call: AIToolCall,
  signal?: AbortSignal,
) => Promise<AIToolResult>;

export interface AIToolRegistry {
  register(definition: AIToolDefinition, handler: AIToolHandler): void;
  unregister(name: AIToolName): boolean;
  list(): readonly AIToolDefinition[];
  get(name: AIToolName): AIToolDefinition | undefined;
  execute(call: AIToolCall, signal?: AbortSignal): Promise<AIToolResult>;
}

const RESERVED_TOOLS: readonly AIToolDefinition[] = [
  {
    name: "search_customers",
    description: "Search customers in the active organization",
    parameters: [
      { name: "query", type: "string", required: true },
      { name: "limit", type: "number" },
    ],
    category: "crm",
  },
  {
    name: "create_invoice",
    description: "Create an invoice draft",
    parameters: [
      { name: "customerId", type: "string", required: true },
      { name: "amount", type: "number", required: true },
      { name: "currency", type: "string" },
    ],
    category: "finance",
  },
  {
    name: "analyze_revenue",
    description: "Analyze revenue for a period",
    parameters: [
      { name: "period", type: "string", required: true },
    ],
    category: "analytics",
  },
  {
    name: "generate_report",
    description: "Generate a business report",
    parameters: [
      { name: "reportType", type: "string", required: true },
    ],
    category: "analytics",
  },
  {
    name: "read_pdf",
    description: "Read and summarize a PDF file",
    parameters: [{ name: "fileId", type: "string", required: true }],
    category: "files",
  },
  {
    name: "search_files",
    description: "Search organization files",
    parameters: [{ name: "query", type: "string", required: true }],
    category: "files",
  },
  {
    name: "create_task",
    description: "Create a task",
    parameters: [
      { name: "title", type: "string", required: true },
      { name: "assigneeId", type: "string" },
    ],
    category: "tasks",
  },
  {
    name: "schedule_meeting",
    description: "Schedule a meeting",
    parameters: [
      { name: "title", type: "string", required: true },
      { name: "startsAt", type: "string", required: true },
    ],
    category: "calendar",
  },
  {
    name: "send_email",
    description: "Draft or send an email",
    parameters: [
      { name: "to", type: "string", required: true },
      { name: "subject", type: "string", required: true },
      { name: "body", type: "string", required: true },
    ],
    category: "email",
  },
] as const;

export function createToolRegistry(): AIToolRegistry {
  const definitions = new Map<string, AIToolDefinition>();
  const handlers = new Map<string, AIToolHandler>();

  for (const tool of RESERVED_TOOLS) {
    definitions.set(tool.name, tool);
    handlers.set(tool.name, async (call) => ({
      toolCallId: call.id,
      name: call.name,
      ok: true,
      output: {
        status: "stub",
        message: `Tool "${call.name}" is registered. Connect a real handler later.`,
        arguments: call.arguments,
      },
    }));
  }

  return {
    register(definition, handler) {
      definitions.set(definition.name, definition);
      handlers.set(definition.name, handler);
    },
    unregister(name) {
      handlers.delete(name);
      return definitions.delete(name);
    },
    list() {
      return [...definitions.values()];
    },
    get(name) {
      return definitions.get(name);
    },
    async execute(call, signal) {
      const handler = handlers.get(call.name);
      if (!handler) {
        return {
          toolCallId: call.id,
          name: call.name,
          ok: false,
          output: null,
          error: `Unknown tool: ${call.name}`,
        };
      }
      if (signal?.aborted) {
        return {
          toolCallId: call.id,
          name: call.name,
          ok: false,
          output: null,
          error: "Aborted",
        };
      }
      return handler(call, signal);
    },
  };
}

export const defaultToolRegistry = createToolRegistry();
