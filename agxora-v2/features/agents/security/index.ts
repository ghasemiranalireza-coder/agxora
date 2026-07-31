/**
 * Agent security — workspace isolation, tool isolation, permission checks.
 */

import type {
  AgentDefinition,
  AgentPermission,
  AgentOsSettings,
  ToolId,
} from "../types";
import { getToolDefinition } from "../tools";

export function canAgent(
  granted: readonly AgentPermission[],
  needed: AgentPermission,
): boolean {
  return granted.includes(needed) || granted.includes("agents.admin");
}

export function assertToolAllowed(
  definition: AgentDefinition,
  toolId: ToolId,
  settings: AgentOsSettings,
): void {
  if (!definition.tools.includes(toolId)) {
    throw new Error(`Tool ${toolId} is not allowed for agent ${definition.id}`);
  }
  const tool = getToolDefinition(toolId);
  if (settings.isolateSensitiveTools && tool?.sensitive) {
    if (!canAgent(definition.permissions, "tools.invoke")) {
      throw new Error(`Sensitive tool ${toolId} blocked by permissions`);
    }
  }
}

export function assertWorkspaceIsolation(
  organizationId: string,
  resourceOrganizationId: string,
): void {
  if (organizationId !== resourceOrganizationId) {
    throw new Error("Workspace isolation violation");
  }
}
