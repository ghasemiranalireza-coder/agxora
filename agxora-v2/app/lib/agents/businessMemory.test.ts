import { beforeEach, describe, expect, it } from "vitest";
import { auditLogger } from "@/app/lib/backend/audit/logger";
import { isBusinessMemoryValue } from "@/features/agents/memory/businessContext";
import {
  authoritativeBusinessMemory,
  createBusinessMemory,
  customerBusinessContext,
  organizationBusinessContext,
  updateBusinessMemory,
} from "@/features/agents/memory/businessMemory";
import { resolveBusinessGoalPlannerContext } from "@/features/agents/orchestration/plannerContext";
import { normalizeState } from "@/features/agents/repositories";
import { agentsStore } from "@/features/agents/store";
import { createMemoryCrmBridge, setCrmBridgeProvider } from "@/features/agents/crm";

const ORG = "org_phase14";
const OTHER = "org_phase14_other";
const CUSTOMER = "11111111-1111-4111-8111-111111111111";
const OTHER_CUSTOMER = "22222222-2222-4222-8222-222222222222";

describe("Phase 14 business memory", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  it("stores verified and unverified memory and only plans with verified facts", async () => {
    const provider = createMemoryCrmBridge();
    const customer = await provider.createCustomer(ORG, {
      companyName: "ABC GmbH",
      contactName: "Ada",
      email: "ada@abc.test",
      phone: "+49",
      address: "1",
      city: "Berlin",
      country: "DE",
      status: "active",
      owner: "tester",
    });
    setCrmBridgeProvider(provider);
    const verified = createBusinessMemory({
      organizationId: ORG,
      actorId: "actor",
      subjectType: "customer",
      subjectId: customer.id,
      memoryType: "CUSTOMER_PREFERENCE",
      content: "Customer prefers email.",
      status: "VERIFIED",
      provenance: "USER_INPUT",
    });
    createBusinessMemory({
      organizationId: ORG,
      subjectType: "customer",
      subjectId: customer.id,
      memoryType: "CUSTOMER_PREFERENCE",
      content: "Customer probably prefers phone.",
      status: "UNVERIFIED",
      provenance: "USER_INPUT",
    });
    createBusinessMemory({
      organizationId: ORG,
      subjectType: "customer",
      subjectId: customer.id,
      memoryType: "CUSTOMER_FACT",
      content: "Old phone number.",
      status: "STALE",
      provenance: "CRM",
    });
    createBusinessMemory({
      organizationId: ORG,
      subjectType: "customer",
      subjectId: OTHER_CUSTOMER,
      memoryType: "CUSTOMER_FACT",
      content: "Other customer fact.",
      status: "VERIFIED",
      provenance: "CRM",
    });
    createBusinessMemory({
      organizationId: ORG,
      subjectType: "organization",
      memoryType: "BUSINESS_RULE",
      content: "Customer follow-ups require human approval.",
      status: "VERIFIED",
      provenance: "SYSTEM",
    });
    const context = await resolveBusinessGoalPlannerContext({
      organizationId: ORG,
      statement: `Prepare a CRM follow-up for this customer. ${customer.id}`,
      customerId: customer.id,
    });
    const text = context.facts.map((fact) => fact.text).join("\n");
    expect(text).toContain("VERIFIED CUSTOMER_PREFERENCE (USER_INPUT): Customer prefers email.");
    expect(text).toContain("BUSINESS_RULE");
    expect(text).not.toContain("probably prefers phone");
    expect(text).not.toContain("Old phone number");
    expect(text).not.toContain("Other customer fact");
    expect(context.memoryIds).toContain(verified.id);
    expect(context.facts.some((fact) => fact.provenance === "BUSINESS_MEMORY")).toBe(true);
  });

  it("rejects cross-tenant reads and preserves history on conflict", () => {
    const record = createBusinessMemory({
      organizationId: ORG,
      subjectType: "organization",
      memoryType: "BUSINESS_FACT",
      content: "Preferred contact method = phone",
      status: "VERIFIED",
      provenance: "USER_INPUT",
    });
    const updated = updateBusinessMemory({
      organizationId: ORG,
      actorId: "actor",
      memoryId: record.id,
      content: "Preferred contact method = email",
      status: "VERIFIED",
      provenance: "USER_INPUT",
    });
    expect(isBusinessMemoryValue(updated.value)).toBe(true);
    if (!isBusinessMemoryValue(updated.value)) return;
    expect(updated.value.history[0]?.content).toBe("Preferred contact method = phone");
    expect(updated.value.conflict).toBe(true);
    expect(updated.value.content).toBe("Preferred contact method = email");
    expect(authoritativeBusinessMemory({ organizationId: ORG })).toHaveLength(0);
    expect(() => organizationBusinessContext(OTHER)).not.toThrow();
    expect(organizationBusinessContext(OTHER).memories).toHaveLength(0);
    expect(() =>
      updateBusinessMemory({
        organizationId: OTHER,
        memoryId: record.id,
        content: "stolen",
        status: "VERIFIED",
        provenance: "USER_INPUT",
      }),
    ).toThrow(/Memory not found/);
    const customer = customerBusinessContext({ organizationId: ORG, customerId: CUSTOMER });
    expect(customer.edges.every((edge) => edge.organizationId === ORG)).toBe(true);
    expect(auditLogger.list().some((event) => event.action === "business_memory.create" && event.organizationId === ORG)).toBe(true);
  });

  it("keeps memory across a state reload and does not verify a rejected status", () => {
    createBusinessMemory({
      organizationId: ORG,
      subjectType: "customer",
      subjectId: CUSTOMER,
      memoryType: "CUSTOMER_FACT",
      content: "Preferred communication language: German",
      status: "VERIFIED",
      provenance: "CRM",
    });
    const reloaded = normalizeState(JSON.parse(JSON.stringify(agentsStore.getSnapshot())));
    expect(reloaded?.memories.some((record) => isBusinessMemoryValue(record.value) && record.value.content.includes("German"))).toBe(true);
    expect(() =>
      createBusinessMemory({
        organizationId: " ",
        subjectType: "organization",
        memoryType: "BUSINESS_FACT",
        content: "missing tenant",
        status: "UNVERIFIED",
        provenance: "SYSTEM",
      }),
    ).toThrow(/Tenant context/);
  });
});
