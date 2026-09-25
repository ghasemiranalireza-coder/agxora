import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";
import { createMemoryCrmBridge, setCrmBridgeProvider, resetCrmBridgeProvider } from "@/features/agents/crm";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import {
  claimGovernedExecution,
  completeGovernedExecution,
  emailReplayDecision,
  failGovernedExecution,
  listGovernedEvidence,
  noteReplayDecision,
  resetGovernedExecutionMemory,
} from "@/features/agents/evidence/governedExecution";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import { unsupportedCommunicationChannel } from "@/features/agents/orchestration/goalPlan";
import { authorizeGovernedMutation } from "@/features/agents/evidence/governedAuthorization";
import { emailAttemptDecision } from "@/features/agents/evidence/governedExecution";

const ORG = "org_phase18_a";
const OTHER = "org_phase18_b";

function claimBase(overrides?: Partial<Parameters<typeof claimGovernedExecution>[0]>) {
  return {
    organizationId: ORG,
    idempotencyKey: "goal_1:execute",
    executionId: "aexec_1",
    businessGoalId: "goal_1",
    planId: "plan_1",
    stepId: "step_execute",
    capabilityId: "CRM_CREATE_NOTE",
    workerId: "worker_1",
    actorId: "user_1",
    approvalRequired: true,
    approvalGranted: true,
    ...overrides,
  };
}

describe("Phase 18 durable governed execution", () => {
  beforeEach(() => {
    resetGovernedExecutionMemory();
    agentsStore.reset();
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  it("reserves one execution and keeps evidence after agent state reload", async () => {
    const first = await claimGovernedExecution(claimBase());
    expect(first.kind).toBe("reserved");
    await completeGovernedExecution({
      organizationId: ORG,
      idempotencyKey: "goal_1:execute",
      verificationStatus: "verified",
      outcome: { toolOutput: { note: { id: "note_1", customerId: "cust_1" } } },
    });
    const { recordGovernedEvidence } = await import("@/features/agents/evidence/governedExecution");
    recordGovernedEvidence({
      organizationId: ORG,
      executionId: "aexec_1",
      businessGoalId: "goal_1",
      workerId: "worker_1",
      actorId: "user_1",
      action: "verification.result",
      status: "verified",
    });
    agentsStore.reset();
    const replay = await claimGovernedExecution(claimBase());
    expect(replay.kind).toBe("replay");
    expect(listGovernedEvidence(ORG, "aexec_1").map((row) => row.action)).toEqual([
      "verification.result",
    ]);
    expect(listGovernedEvidence(OTHER)).toHaveLength(0);
  });

  it("runs one protected mutation for a retry and a concurrent claim", async () => {
    let writes = 0;
    async function mutate(key: string) {
      const claim = await claimGovernedExecution(claimBase({ idempotencyKey: key }));
      if (claim.kind === "replay") return claim.outcome;
      if (claim.kind === "in_progress") return { duplicate: true };
      writes += 1;
      const outcome = { toolOutput: { note: { id: "note_once", customerId: "cust_1" } } };
      await completeGovernedExecution({
        organizationId: ORG,
        idempotencyKey: key,
        verificationStatus: "pending",
        outcome,
      });
      return outcome;
    }
    const [left, right] = await Promise.all([mutate("same"), mutate("same")]);
    expect(writes).toBe(1);
    expect([left, right].filter((item) => "duplicate" in (item as object) || (item as { toolOutput?: unknown }).toolOutput).length).toBe(2);
    writes = 0;
    await mutate("same");
    expect(writes).toBe(0);
  });

  it("isolates the same idempotency key by organization", async () => {
    expect((await claimGovernedExecution(claimBase())).kind).toBe("reserved");
    expect((await claimGovernedExecution(claimBase({ organizationId: OTHER }))).kind).toBe("reserved");
  });

  it("does not let a failed execution become verified", async () => {
    await claimGovernedExecution(claimBase());
    await failGovernedExecution({
      organizationId: ORG,
      idempotencyKey: "goal_1:execute",
      mutated: true,
    });
    await completeGovernedExecution({
      organizationId: ORG,
      idempotencyKey: "goal_1:execute",
      verificationStatus: "verified",
      outcome: { toolOutput: { verified: true } },
    });
    const replay = await claimGovernedExecution(claimBase());
    expect(replay.kind).toBe("replay");
    if (replay.kind === "replay") expect(replay.status).toBe("FAILED");
  });

  it("keeps approval, finance, and unsupported channels blocked", async () => {
    expect(authorizeCapabilityExecution({ capabilityId: "FINANCE_CREATE_INVOICE", organizationId: ORG }).ok).toBe(false);
    expect(unsupportedCommunicationChannel("Send a WhatsApp message")).toBeTruthy();
    expect(unsupportedCommunicationChannel("Text the customer by SMS")).toBeTruthy();
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    agentOsService.ensureWorkspace(ORG);
    const runtime = agentOsService.listRuntimes(ORG).find((item) => item.agentId === "crm_assistant");
    const customer = await provider.createCustomer(
      ORG,
      emptyCustomerDraft({
        companyName: "Phase 18",
        contactName: "Ada",
        email: "ada@phase18.test",
        phone: "+49 30 1",
        address: "Street 1",
        city: "Berlin",
        country: "DE",
        status: "active",
        owner: "tester",
      }),
    );
    const goal = await startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime!.instanceId,
      statement: "Prepare a CRM follow-up for this customer.",
      workerId: undefined,
      actorId: "user_actor",
    });
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
    expect(listGovernedEvidence(ORG).some((row) => row.action === "goal.created")).toBe(true);
    expect(listGovernedEvidence(ORG).some((row) => row.action === "approval.requested")).toBe(true);
    const approval = agentOsService.listApprovals(ORG)[0];
    await agentOsService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "user_actor",
    });
    expect(await provider.listNotes(customer.id)).toHaveLength(1);
    const again = agentOsService.listApprovals(ORG)[0];
    await agentOsService.resolveApproval({
      approvalId: again.id,
      state: "APPROVED",
      decidedBy: "user_actor",
    });
    expect(await provider.listNotes(customer.id)).toHaveLength(1);
    const evidence = listGovernedEvidence(ORG);
    expect(evidence.some((row) => row.action === "approval.granted" && row.actorId === "user_actor")).toBe(true);
    expect(evidence.some((row) => row.action === "verification.result" && row.status === "verified")).toBe(true);
    expect(evidence.some((row) => row.action === "goal.completed" && row.status === "verified")).toBe(true);
    const memory = agentsStore.getSnapshot().memories.find((item) => {
      const value = item.value as { memoryType?: string; status?: string; sourceReference?: string };
      return item.organizationId === ORG && value.memoryType === "GOAL_OUTCOME" && value.status === "VERIFIED";
    });
    const value = memory?.value as { sourceReference?: string };
    expect(value.sourceReference).toBe(goal.taskId ? agentsStore.getSnapshot().tasks.find((task) => task.id === goal.taskId)?.executionId : undefined);
  });

  it("rejects an email or note replay for a different customer", () => {
    expect(emailReplayDecision({
      outcome: { delivery: "queued", recipient: "a@customer.test", customerId: "cust_a", mutated: true },
      customerId: "cust_b",
      recipient: "b@customer.test",
    })).toBe("mismatch");
    expect(emailReplayDecision({
      outcome: { delivery: "queued", recipient: "a@customer.test", customerId: "cust_a", mutated: true },
      customerId: "cust_a",
      recipient: "a@customer.test",
    })).toBe("replay");
    expect(noteReplayDecision({
      outcome: { noteId: "note_1", customerId: "cust_a", mutated: true },
      customerId: "cust_b",
    })).toBe("mismatch");
    expect(noteReplayDecision({
      outcome: { noteId: "note_1", customerId: "cust_a", mutated: true },
      customerId: "cust_a",
    })).toEqual({ noteId: "note_1", customerId: "cust_a" });
  });

  it("rejects an unapproved or cross-tenant governed mutation and a missing key", () => {
    const state = {
      approvals: [{ organizationId: ORG, executionId: "aexec_1", stepId: "step_execute", state: "REQUIRES_APPROVAL" }],
      executions: [{ id: "aexec_1", organizationId: ORG, planId: "plan_1", workerId: "worker_1", actorId: "user_1" }],
      plans: [{
        id: "plan_1",
        organizationId: ORG,
        goalId: "goal_1",
        steps: [{ id: "step_execute", capabilityId: "CRM_CREATE_NOTE", idempotencyKey: "goal_1:execute" }],
      }],
      businessGoals: [{ id: "goal_1", organizationId: ORG, workerId: "worker_1", actorId: "user_1" }],
      workers: [{ id: "worker_1", organizationId: ORG, status: "ACTIVE", allowedCapabilities: ["CRM_CREATE_NOTE"] }],
    };
    expect(authorizeGovernedMutation({
      organizationId: ORG,
      actorId: "user_1",
      capabilityId: "CRM_CREATE_NOTE",
      idempotencyKey: "",
      executionId: "aexec_1",
      stepId: "step_execute",
      state,
    }).ok).toBe(false);
    expect(authorizeGovernedMutation({
      organizationId: ORG,
      actorId: "user_1",
      capabilityId: "CRM_CREATE_NOTE",
      idempotencyKey: "goal_1:execute",
      executionId: "aexec_1",
      stepId: "step_execute",
      state,
    }).ok).toBe(false);
    const approved = {
      ...state,
      approvals: [{ organizationId: ORG, executionId: "aexec_1", stepId: "step_execute", state: "APPROVED" }],
    };
    const allowed = authorizeGovernedMutation({
      organizationId: ORG,
      actorId: "user_1",
      capabilityId: "CRM_CREATE_NOTE",
      idempotencyKey: "goal_1:execute",
      executionId: "aexec_1",
      stepId: "step_execute",
      state: approved,
    });
    expect(allowed.ok).toBe(true);
    expect(authorizeGovernedMutation({
      organizationId: OTHER,
      actorId: "user_1",
      capabilityId: "CRM_CREATE_NOTE",
      idempotencyKey: "goal_1:execute",
      executionId: "aexec_1",
      stepId: "step_execute",
      state: approved,
    }).ok).toBe(false);
    expect(authorizeGovernedMutation({
      organizationId: ORG,
      actorId: "user_1",
      capabilityId: "FINANCE_CREATE_INVOICE",
      idempotencyKey: "goal_1:execute",
      executionId: "aexec_1",
      stepId: "step_execute",
      state: approved,
    }).ok).toBe(false);
  });

  it("does not resend a stale or ambiguous email attempt", () => {
    expect(emailAttemptDecision({
      status: "EXECUTING",
      mutated: false,
      attemptStartedAt: "2026-09-24T00:00:00.000Z",
      now: "2026-09-24T00:00:05.000Z",
    })).toBe("in_progress");
    expect(emailAttemptDecision({
      status: "EXECUTING",
      mutated: false,
      attemptStartedAt: "2026-09-24T00:00:00.000Z",
      now: "2026-09-24T00:03:00.000Z",
    })).toBe("ambiguous");
    expect(emailAttemptDecision({
      status: "AMBIGUOUS",
      mutated: false,
      attemptStartedAt: "2026-09-24T00:00:00.000Z",
      now: "2026-09-24T00:10:00.000Z",
    })).toBe("ambiguous");
    expect(emailAttemptDecision({
      status: "COMPLETED",
      mutated: true,
      attemptStartedAt: "2026-09-24T00:00:00.000Z",
      now: "2026-09-24T00:10:00.000Z",
    })).toBe("replay");
    expect(emailAttemptDecision({
      status: "FAILED",
      mutated: false,
      attemptStartedAt: "2026-09-24T00:00:00.000Z",
      now: "2026-09-24T00:10:00.000Z",
    })).toBe("reopen");
  });

  it("enforces the database uniqueness constraint in the migration", () => {
    const sql = readFileSync(
      join(process.cwd(), "prisma/migrations/20260924190000_phase18_governed_execution/migration.sql"),
      "utf8",
    );
    expect(sql).toContain('CREATE UNIQUE INDEX "agent_governed_executions_organizationId_idempotencyKey_key"');
    expect(sql).toContain("agent_governed_evidence");
    const recovery = readFileSync(
      join(process.cwd(), "prisma/migrations/20260924200000_phase18_execution_recovery/migration.sql"),
      "utf8",
    );
    expect(recovery).toContain("EXECUTING");
    expect(recovery).toContain("AMBIGUOUS");
    expect(recovery).not.toContain("DROP TABLE");
    expect(sql).not.toContain("DROP TABLE");
    expect(sql).not.toContain("DELETE FROM");
  });
});
