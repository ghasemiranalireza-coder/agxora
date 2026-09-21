import { describe, expect, it } from "vitest";
import { handleCrmTool } from "@/features/agents/crm/handlers";
import { handleFinanceTool } from "@/features/agents/finance/handlers";
import {
  listCustomerFacingLlmProviders,
  listLlmProviders,
} from "@/features/agents/llm";
import {
  FIRST_CUSTOMER_AGENT_TOOL_IDS,
  TOOL_CATALOG,
  invokeTool,
  isCustomerFacingAgentTool,
  listCustomerFacingAgentTools,
} from "@/features/agents/tools";

const hiddenSimulatedTools = [
  "projects",
  "documents",
  "workflow",
  "email",
  "calendar",
  "search",
  "api",
  "mcp",
  "notification",
  "social",
  "creative",
] as const;

describe("Day 2 fail-closed agent surface", () => {
  it("TEST E: simulated agent tools are not exposed as customer-facing tools", () => {
    const visible = listCustomerFacingAgentTools().map((tool) => tool.id);
    expect(visible).toEqual(["crm", "finance"]);
    expect(FIRST_CUSTOMER_AGENT_TOOL_IDS).toEqual(["crm", "finance"]);

    for (const id of hiddenSimulatedTools) {
      expect(isCustomerFacingAgentTool(id)).toBe(false);
      expect(visible).not.toContain(id);
    }

    expect(TOOL_CATALOG.some((tool) => tool.id === "projects")).toBe(true);
    expect(listCustomerFacingLlmProviders()).toEqual([]);
    expect(listLlmProviders().every((adapter) => adapter.simulated === true)).toBe(
      true,
    );
  });

  it("TEST F: finance agent billed remains false", async () => {
    const result = await handleFinanceTool({
      organizationId: "org-day2",
      agentInstanceId: "agent-finance",
      taskId: "task-finance",
      params: {
        action: "create_invoice_from_eligible_delivery_notes",
        deliveryNoteIds: ["dn_fake"],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.approvalRequired).toBe(true);
    expect(result.output).toMatchObject({
      billed: false,
      blocked: true,
    });
    expect(JSON.stringify(result.output)).not.toContain('"billed":true');
  });

  it("TEST G: existing CRM agent path remains functional", async () => {
    const result = await handleCrmTool({
      organizationId: "org-day2",
      agentInstanceId: "agent-crm",
      taskId: "task-crm",
      params: { action: "get_link" },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      action: "get_link",
      link: null,
    });

    const invoked = await invokeTool("crm", {
      organizationId: "org-day2",
      agentInstanceId: "agent-crm",
      taskId: "task-crm",
      params: { action: "get_link", step: "read", goal: "read CRM link" },
    });
    expect(invoked.ok).toBe(true);
  });
});
