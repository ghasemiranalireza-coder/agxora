import { beforeEach, describe, expect, it } from "vitest";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";
import { handleCommunicationTool, setCustomerEmailSenderForTests, type CustomerEmailSendInput } from "@/features/agents/communication/handlers";
import { createMemoryCrmBridge, setCrmBridgeProvider } from "@/features/agents/crm";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import { isBusinessMemoryValue } from "@/features/agents/memory/businessContext";
import { normalizeBusinessGoalIntent } from "@/features/agents/orchestration/goalPlanner";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { createWorker } from "@/features/agents/workforce/workers";

const ORG = "org_phase16";

function runtime() {
  agentOsService.ensureWorkspace(ORG);
  const found = agentOsService.listRuntimes(ORG).find((item) => item.agentId === "crm_assistant");
  if (!found) throw new Error("missing runtime");
  return found;
}

async function customer(email = "ada@e2e.test") {
  const provider = createMemoryCrmBridge();
  const created = await provider.createCustomer(ORG, emptyCustomerDraft({
    companyName: "Ada",
    contactName: "Ada",
    email,
    phone: "+49",
    address: "1",
    city: "Berlin",
    country: "DE",
    status: "active",
    owner: "tester",
  }));
  setCrmBridgeProvider(provider);
  return { provider, created };
}

describe("Phase 16 customer communication workforce", () => {
  const sends: CustomerEmailSendInput[] = [];

  beforeEach(() => {
    sends.length = 0;
    agentsStore.reset();
    setCustomerEmailSenderForTests(async (input) => {
      sends.push(input);
      return { ok: true, delivery: "queued", recipient: "ada@e2e.test" };
    });
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  it("normalizes communication goals and rejects unsupported channels", () => {
    expect(normalizeBusinessGoalIntent("Reply to John about his order.")?.goalType).toBe("customer_reply");
    expect(normalizeBusinessGoalIntent("Follow up with this customer.")?.goalType).toBe("crm_follow_up");
    expect(normalizeBusinessGoalIntent("Follow up with this customer and record what happened.")?.goalType).toBe("follow_up_and_record");
    expect(normalizeBusinessGoalIntent("Contact this customer about their open request.")?.goalType).toBe("customer_reply");
    expect(normalizeBusinessGoalIntent("Prepare a follow-up message for this customer.")?.goalType).toBe("customer_reply");
    expect(normalizeBusinessGoalIntent("Send the approved follow-up and record it in CRM.")?.goalType).toBe("follow_up_and_record");
    expect(normalizeBusinessGoalIntent("Message this customer on WhatsApp.")).toBeNull();
    expect(authorizeCapabilityExecution({ capabilityId: "FINANCE_CREATE_INVOICE", organizationId: ORG }).ok).toBe(false);
  });

  it("prepares an inspectable draft, sends once after approval, and stores queued memory", async () => {
    const { created } = await customer();
    const worker = createWorker({ organizationId: ORG, actorId: "user_1", role: "CUSTOMER_COMMUNICATION" });
    const goal = await startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: `Reply to this customer. ${created.id}`,
      workerId: worker.id,
      actorId: "user_1",
    });
    expect(sends).toHaveLength(0);
    const waiting = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    const draft = (waiting?.steps.find((step) => step.capabilityId === "COMMUNICATION_PREPARE_EMAIL")?.result as { draft?: { to?: string; channel?: string; approvalRequired?: boolean } }).draft;
    expect(draft?.to).toBe("ada@e2e.test");
    expect(draft?.channel).toBe("email");
    expect(draft?.approvalRequired).toBe(true);
    expect(waiting?.plannerContext?.facts.some((fact) => fact.provenance === "WORKER")).toBe(true);
    const approval = agentOsService.listApprovals(ORG).find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({ approvalId: approval!.id, state: "APPROVED", decidedBy: "user_1" });
    await agentOsService.resolveApproval({ approvalId: approval!.id, state: "APPROVED", decidedBy: "user_1" });
    expect(sends).toHaveLength(1);
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    const execution = agentsStore.getSnapshot().executions.find((item) => item.id === finished?.executionId);
    expect(finished?.status).toBe("completed");
    expect(execution?.workerId).toBe(worker.id);
    expect(execution?.actorId).toBe("user_1");
    const memory = agentsStore.getSnapshot().memories.find((record) => isBusinessMemoryValue(record.value) && record.value.memoryType === "CUSTOMER_INTERACTION_SUMMARY");
    expect(memory && isBusinessMemoryValue(memory.value) ? memory.value.content : "").toMatch(/queued/);
    expect(memory && isBusinessMemoryValue(memory.value) ? memory.value.content : "").not.toMatch(/delivered/i);
    expect(memory && isBusinessMemoryValue(memory.value) ? memory.value.status : "").toBe("VERIFIED");
  });

  it("does not repeat a verified send when CRM recording fails", async () => {
    const { provider, created } = await customer();
    provider.createNote = async () => {
      throw new Error("crm write failed");
    };
    const goal = await startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: `Reply to this customer and record the interaction. ${created.id}`,
      actorId: "user_1",
    });
    const emailApproval = agentOsService.listApprovals(ORG).find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({ approvalId: emailApproval!.id, state: "APPROVED", decidedBy: "user_1" });
    expect(sends).toHaveLength(1);
    const noteApproval = agentOsService.listApprovals(ORG).find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({ approvalId: noteApproval!.id, state: "APPROVED", decidedBy: "user_1" });
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(finished?.status).toBe("failed");
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.steps.find((step) => step.capabilityId === "COMMUNICATION_VERIFY_EMAIL")?.verification).toBe("verified");
    expect(plan?.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE")?.status).toBe("failed");
    if (finished?.taskId) await agentOsService.executeTask(finished.taskId);
    expect(sends).toHaveLength(1);
    expect(agentsStore.getSnapshot().memories.some((record) => isBusinessMemoryValue(record.value) && record.value.memoryType === "CUSTOMER_INTERACTION_SUMMARY")).toBe(false);
  });

  it("blocks a recipient that does not belong to the customer", async () => {
    const { created } = await customer();
    const result = await handleCommunicationTool({
      organizationId: ORG,
      agentInstanceId: "instance",
      taskId: "task",
      params: {
        action: "send_customer_email",
        customerId: created.id,
        goal: "Reply to this customer.",
        to: "other@example.com",
        subject: "Hello",
        body: "Hello",
        idempotencyKey: "goal:send",
      },
    });
    expect(result.ok).toBe(false);
    expect(sends).toHaveLength(0);
    expect(result.error).toMatch(/does not match/);
  });

  it("blocks paused workers and keeps finance unavailable", async () => {
    const { created } = await customer();
    const paused = createWorker({ organizationId: ORG, actorId: "user_1", role: "CUSTOMER_COMMUNICATION", status: "PAUSED" });
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: `Reply to this customer. ${created.id}`,
      workerId: paused.id,
      actorId: "user_1",
    })).rejects.toThrow(/not active/);
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: "Send a WhatsApp message to this customer.",
    })).rejects.toThrow(/capabilityUnavailable/);
    expect(sends).toHaveLength(0);
  });
});
