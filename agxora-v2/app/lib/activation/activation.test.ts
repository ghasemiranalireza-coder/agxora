import { describe, expect, it } from "vitest";
import { normalizeBusinessGoalIntent } from "@/features/agents/orchestration/goalPlanner";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";
import { ACTIVATION_CRM_FOLLOW_UP_STATEMENT } from "./statement";
import { deriveActivation } from "./derive";
import { activationCommunicationCapabilities, buildActivationCommunicationWorker } from "./workerRecord";

const ORG = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";

describe("phase 19 activation", () => {
  it("uses a CRM follow-up statement and does not plan an email send", () => {
    const intent = normalizeBusinessGoalIntent(ACTIVATION_CRM_FOLLOW_UP_STATEMENT);
    expect(intent?.goalType).toBe("crm_follow_up");
    expect(intent?.capabilityIds).toContain("CRM_CREATE_NOTE");
    expect(intent?.capabilityIds).not.toContain("COMMUNICATION_SEND_EMAIL");
    expect(intent?.capabilityIds).not.toContain("FINANCE_CREATE_INVOICE");
  });

  it("rejects an unsupported free-form goal", () => {
    expect(normalizeBusinessGoalIntent("Increase revenue for the company")).toBeNull();
    expect(normalizeBusinessGoalIntent("Send a WhatsApp message")).toBeNull();
  });

  it("keeps finance blocked and out of the activation worker", () => {
    const decision = authorizeCapabilityExecution({
      capabilityId: "FINANCE_CREATE_INVOICE",
      organizationId: ORG,
    });
    expect(decision.ok).toBe(false);
    const capabilities = activationCommunicationCapabilities();
    expect(capabilities).toContain("CRM_CREATE_NOTE");
    expect(capabilities).not.toContain("FINANCE_CREATE_INVOICE");
    const worker = buildActivationCommunicationWorker(ORG);
    expect(worker.organizationId).toBe(ORG);
    expect(worker.status).toBe("ACTIVE");
    expect(worker.role).toBe("CUSTOMER_COMMUNICATION");
    expect(worker.allowedCapabilities).not.toContain("FINANCE_CREATE_INVOICE");
  });

  it("asks for a customer when the organization has none", () => {
    const status = deriveActivation({
      organizationId: ORG,
      customers: [],
      workers: [],
      followUpStarted: false,
      approvedExecutionIds: [],
      completed: null,
      verifiedExecutionIds: [],
    });
    expect(status.next).toBe("customer");
    expect(status.steps.find((step) => step.id === "organization")?.done).toBe(true);
  });

  it("asks for a worker after the first customer exists", () => {
    const status = deriveActivation({
      organizationId: ORG,
      customers: [{ id: CUSTOMER, companyName: "Northwind" }],
      workers: [],
      followUpStarted: false,
      approvedExecutionIds: [],
      completed: null,
      verifiedExecutionIds: [],
    });
    expect(status.next).toBe("worker");
  });

  it("does not treat a finance-capable worker as the communication worker", () => {
    const status = deriveActivation({
      organizationId: ORG,
      customers: [{ id: CUSTOMER, companyName: "Northwind" }],
      workers: [{
        id: "worker_finance",
        organizationId: ORG,
        role: "CUSTOMER_COMMUNICATION",
        status: "ACTIVE",
        allowedCapabilities: ["CRM_CREATE_NOTE", "FINANCE_CREATE_INVOICE"],
      }],
      followUpStarted: false,
      approvedExecutionIds: [],
      completed: null,
      verifiedExecutionIds: [],
    });
    expect(status.workerId).toBeNull();
    expect(status.next).toBe("worker");
  });

  it("moves from an active worker to the guided goal, then approval, then verification", () => {
    const worker = {
      id: "worker_1",
      organizationId: ORG,
      role: "CUSTOMER_COMMUNICATION",
      status: "ACTIVE",
      allowedCapabilities: ["CRM_CREATE_NOTE"],
    };
    const customers = [{ id: CUSTOMER, companyName: "Northwind" }];
    const ready = deriveActivation({
      organizationId: ORG,
      customers,
      workers: [worker],
      followUpStarted: false,
      approvedExecutionIds: [],
      completed: null,
      verifiedExecutionIds: [],
    });
    expect(ready.next).toBe("goal");

    const started = deriveActivation({
      organizationId: ORG,
      customers,
      workers: [worker],
      followUpStarted: true,
      approvedExecutionIds: [],
      completed: null,
      verifiedExecutionIds: [],
    });
    expect(started.next).toBe("approval");

    const approved = deriveActivation({
      organizationId: ORG,
      customers,
      workers: [worker],
      followUpStarted: true,
      approvedExecutionIds: ["exec_1"],
      completed: null,
      verifiedExecutionIds: [],
    });
    expect(approved.next).toBe("verification");

    const verified = deriveActivation({
      organizationId: ORG,
      customers,
      workers: [worker],
      followUpStarted: true,
      approvedExecutionIds: ["exec_1"],
      completed: {
        executionId: "exec_1",
        noteId: "note_1",
        customerId: CUSTOMER,
        workerId: "worker_1",
        actorId: "user_1",
      },
      verifiedExecutionIds: ["exec_1"],
    });
    expect(verified.next).toBe("done");
    expect(verified.result).toMatchObject({
      companyName: "Northwind",
      noteId: "note_1",
      executionId: "exec_1",
      actorId: "user_1",
      verified: true,
    });
  });
});
