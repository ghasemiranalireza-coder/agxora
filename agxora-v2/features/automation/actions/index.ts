/**
 * Action registry — provider pattern; no UI coupling.
 * Handlers are stubs ready for backend / AI agent wiring.
 */

import type {
  ActionHandler,
  ActionHandlerContext,
  ActionHandlerResult,
  ActionType,
} from "../types";

export interface ActionDefinition {
  readonly type: ActionType;
  readonly label: string;
  readonly description: string;
  readonly module: string;
}

export const ACTION_CATALOG: readonly ActionDefinition[] = [
  {
    type: "customer.create",
    label: "Create Customer",
    description: "Create a CRM customer record.",
    module: "crm",
  },
  {
    type: "customer.update",
    label: "Update Customer",
    description: "Update fields on a customer.",
    module: "crm",
  },
  {
    type: "project.create",
    label: "Create Project",
    description: "Create a project from workflow context.",
    module: "projects",
  },
  {
    type: "document.generate",
    label: "Generate Document",
    description: "Generate a document from a template.",
    module: "documents",
  },
  {
    type: "notification.send",
    label: "Send Notification",
    description: "Push an in-app notification.",
    module: "notifications",
  },
  {
    type: "email.send",
    label: "Send Email",
    description: "Queue an email via the mail provider.",
    module: "email",
  },
  {
    type: "api.call",
    label: "Call API",
    description: "HTTP call to an external or internal API.",
    module: "api",
  },
  {
    type: "ai.run",
    label: "Run AI",
    description: "Execute an AI prompt / agent step with context.",
    module: "ai",
  },
  {
    type: "task.assign",
    label: "Assign Task",
    description: "Assign a task to a user.",
    module: "projects",
  },
  {
    type: "invoice.create",
    label: "Create Invoice",
    description: "Create a finance invoice.",
    module: "finance",
  },
  {
    type: "status.update",
    label: "Update Status",
    description: "Update entity status in a module.",
    module: "core",
  },
] as const;

const handlers = new Map<ActionType, ActionHandler>();

function stubHandler(
  type: ActionType,
): ActionHandler {
  return (ctx: ActionHandlerContext): ActionHandlerResult => ({
    ok: true,
    output: {
      actionType: type,
      simulated: true,
      params: ctx.params,
      aiPrompt: ctx.aiPrompt,
      at: new Date().toISOString(),
    },
  });
}

for (const def of ACTION_CATALOG) {
  handlers.set(def.type, stubHandler(def.type));
}

export function registerActionHandler(
  type: ActionType,
  handler: ActionHandler,
): void {
  handlers.set(type, handler);
}

export function getActionHandler(type: ActionType): ActionHandler {
  return handlers.get(type) ?? stubHandler(type);
}

export function getActionDefinition(
  type: ActionType,
): ActionDefinition | undefined {
  return ACTION_CATALOG.find((a) => a.type === type);
}

export async function executeAction(
  type: ActionType,
  ctx: ActionHandlerContext,
): Promise<ActionHandlerResult> {
  const handler = getActionHandler(type);
  return Promise.resolve(handler(ctx));
}
