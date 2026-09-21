import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRIMARY_NAV_ITEMS } from "./firstCustomerSurface";
import {
  AGENT_CRM_CUSTOMER_READ_FIELDS,
  AGENT_CRM_IGNORED_CLIENT_TENANT_KEYS,
  FIRST_CUSTOMER_AGENT_CRM_HREF,
  agentCrmCustomerIdErrorMessage,
  agentCrmCustomerIdIssue,
  agentCrmHonestyKind,
  assertRealCustomerId,
  isCrmCustomerIdInvalidError,
  isMockCustomerId,
  parseRealCustomerId,
} from "./firstCustomerAgentCrm";
import { FIRST_CUSTOMER_AGENT_TOOL_IDS, getToolDefinition } from "@/features/agents/tools";
import {
  createDirectoryCrmBridge,
  createMemoryCrmBridge,
} from "@/features/agents/crm";
import { isCrmDatabaseMode } from "@/app/lib/crm/persistence/mode";

const ROOT = path.resolve(__dirname, "../../..");
const REAL_ID = "2f1c9a7e-4b3d-4a91-9c2e-7d8f0b1a2c3d";

describe("first-customer Agent CRM identity", () => {
  it("accepts a real Prisma customer UUID", () => {
    expect(parseRealCustomerId(REAL_ID)).toBe(REAL_ID);
    expect(agentCrmCustomerIdIssue(REAL_ID)).toBeNull();
    expect(assertRealCustomerId(` ${REAL_ID} `)).toBe(REAL_ID);
    expect(isMockCustomerId(REAL_ID)).toBe(false);
  });

  it("rejects mock cus_* / crm_* / localStorage-shaped IDs", () => {
    for (const id of [
      "cus_123",
      "cus_demo",
      "customer-demo",
      "crm_local_1",
      "crm_mem_1",
      "ccon_1",
      "cnote_1",
      "cact_1",
    ]) {
      expect(parseRealCustomerId(id)).toBeNull();
      expect(isMockCustomerId(id) || agentCrmCustomerIdIssue(id) === "invalid").toBe(
        true,
      );
    }
    expect(agentCrmCustomerIdIssue("cus_123")).toBe("mock");
    expect(agentCrmCustomerIdErrorMessage("mock")).toMatch(/Mock customer/i);
    expect(() => assertRealCustomerId("cus_123")).toThrow(/crm_customer_id_invalid/);
    expect(
      isCrmCustomerIdInvalidError(
        Object.assign(new Error("crm_customer_id_invalid"), {
          name: "CrmCustomerIdInvalidError",
        }),
      ),
    ).toBe(true);
  });

  it("rejects missing and malformed IDs without falling back", () => {
    expect(agentCrmCustomerIdIssue("")).toBe("missing");
    expect(agentCrmCustomerIdIssue("   ")).toBe("missing");
    expect(agentCrmCustomerIdIssue("not-a-uuid")).toBe("invalid");
    expect(parseRealCustomerId("11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("never treats completed as success unless the CRM mutation/read persisted", () => {
    expect(
      agentCrmHonestyKind({
        jobStatus: "WAITING_FOR_APPROVAL",
        resultSuccess: false,
      }),
    ).toBe("waiting_approval");
    expect(
      agentCrmHonestyKind({
        jobStatus: "COMPLETED",
        resultSuccess: true,
      }),
    ).toBe("completed");
    expect(
      agentCrmHonestyKind({
        jobStatus: "COMPLETED",
        resultSuccess: false,
      }),
    ).toBe("failed");
    expect(
      agentCrmHonestyKind({
        jobStatus: "FAILED",
        resultSuccess: false,
      }),
    ).toBe("failed");
    expect(
      agentCrmHonestyKind({
        jobStatus: "BLOCKED",
        crmAvailable: false,
      }),
    ).toBe("unavailable");
    expect(
      agentCrmHonestyKind({
        jobStatus: "FAILED",
        invalidCustomerId: true,
      }),
    ).toBe("invalid_id");
  });

  it("keeps the customer-facing Agent CRM path on real CRM + approval", () => {
    expect(FIRST_CUSTOMER_AGENT_CRM_HREF).toBe("/dashboard/crm");
    expect(PRIMARY_NAV_ITEMS.some((item) => item.href === "/dashboard/agents")).toBe(
      true,
    );
    expect(FIRST_CUSTOMER_AGENT_TOOL_IDS).toEqual(["crm", "finance"]);
    expect(getToolDefinition("crm")?.requiresApproval).toBe(true);
    expect(AGENT_CRM_CUSTOMER_READ_FIELDS).toEqual([
      "id",
      "companyName",
      "contactName",
      "email",
      "phone",
      "address",
      "city",
      "country",
      "status",
    ]);
    expect(AGENT_CRM_IGNORED_CLIENT_TENANT_KEYS).toEqual([
      "organizationId",
      "workspaceId",
      "tenantId",
      "actorId",
    ]);
  });

  it("fails closed on the directory bridge unless CRM database mode is on", async () => {
    const directory = createDirectoryCrmBridge();
    if (!isCrmDatabaseMode()) {
      expect(directory.available).toBe(false);
      await expect(directory.getCustomer(REAL_ID)).rejects.toMatchObject({
        name: "CrmBridgeUnavailableError",
      });
    } else {
      expect(directory.available).toBe(true);
    }
    await expect(directory.getCustomer("cus_demo")).rejects.toThrow();
    const memory = createMemoryCrmBridge();
    const created = await memory.createCustomer("org_test", {
      companyName: "Memory Co",
      contactName: "Pat",
      email: "pat@memory.test",
      phone: "",
      website: "",
      industry: "",
      country: "",
      city: "",
      address: "",
      taxNumber: "",
      status: "lead",
      owner: "tester",
      tags: "",
    });
    expect(parseRealCustomerId(created.id)).toBe(created.id);
    expect(created.id.startsWith("cus_")).toBe(false);
    expect(created.id.startsWith("crm_")).toBe(false);
  });

  it("does not wire the Agent CRM path to the legacy localStorage customer store", () => {
    const adapter = readFileSync(
      path.join(ROOT, "features/agents/crm/adapter.ts"),
      "utf8",
    );
    const handlers = readFileSync(
      path.join(ROOT, "features/agents/crm/handlers.ts"),
      "utf8",
    );
    const workspace = readFileSync(
      path.join(ROOT, "features/agents/components/OperationsWorkspace.tsx"),
      "utf8",
    );
    const api = readFileSync(
      path.join(ROOT, "app/api/v1/crm/customers/[id]/route.ts"),
      "utf8",
    );
    expect(adapter).toContain("isCrmDatabaseMode()");
    expect(adapter).toContain("createUnavailableCrmBridge");
    expect(adapter).toContain("assertRealCustomerId");
    expect(adapter).not.toContain("agxora-customers-v1");
    expect(handlers).toContain('action === "get_customer"');
    expect(handlers).toContain("ctx.organizationId");
    expect(handlers).toContain('error: "Customer not found"');
    expect(workspace).toContain("agents.crmBridge.honesty");
    expect(workspace).toContain("agents.crmBridge.noticeRequested");
    expect(workspace).toContain("job.result?.success === true");
    expect(api).toContain("requireCurrentActor");
    expect(api).toContain("getCustomerForActor");
    expect(existsSync(path.join(ROOT, "app/lib/customers/repository.ts"))).toBe(
      true,
    );
  });
});
