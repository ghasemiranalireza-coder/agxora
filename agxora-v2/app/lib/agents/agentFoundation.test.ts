import { beforeEach, describe, expect, it } from "vitest";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";

describe("Phase 42 agent foundation", () => {
  const organizationId = "org_phase42_test";

  beforeEach(() => {
    agentsStore.reset();
  });

  it("pauses for approval and resumes a guarded execution", async () => {
    agentOsService.ensureWorkspace(organizationId);
    const runtime = agentOsService
      .listRuntimes(organizationId)
      .find((item) => item.agentId === "workflow_coordinator");

    expect(runtime).toBeTruthy();

    const blockedTask = await agentOsService.enqueueTask({
      organizationId,
      agentInstanceId: runtime!.instanceId,
      title: "Trigger workflow approval path",
      goal: "Trigger workflow approval path",
    });

    expect(blockedTask.status).toBe("blocked");

    const execution = agentOsService
      .listExecutions(organizationId)
      .find((item) => item.id === blockedTask.executionId);
    expect(execution?.lifecycle).toBe("WAITING_FOR_APPROVAL");

    const approval = agentOsService.listApprovals(organizationId)[0];
    expect(approval?.state).toBe("REQUIRES_APPROVAL");

    await agentOsService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });

    const completedTask = agentsStore
      .getSnapshot()
      .tasks.find((item) => item.id === blockedTask.id);
    const completedExecution = agentOsService
      .listExecutions(organizationId)
      .find((item) => item.id === blockedTask.executionId);

    expect(completedTask?.status).toBe("completed");
    expect(completedExecution?.lifecycle).toBe("COMPLETED");
    expect(
      agentOsService
        .listStepExecutions(organizationId)
        .some((event) => event.status === "WAITING_FOR_APPROVAL"),
    ).toBe(true);
  });

  it("exposes minimal agent handlers through the local dispatch architecture", async () => {
    registerLocalDataHandlers();
    agentOsService.ensureWorkspace(organizationId);
    const runtime = agentOsService
      .listRuntimes(organizationId)
      .find((item) => item.agentId === "workflow_coordinator");

    const created = await localDataProvider.request<{
      readonly id: string;
      readonly status: string;
    }>({
      method: "POST",
      path: "/agents/tasks",
      body: {
        organizationId,
        agentInstanceId: runtime!.instanceId,
        title: "API created task",
        goal: "API created task",
      },
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.status).toBe("blocked");

    const approvals = await localDataProvider.request<readonly { id: string }[]>({
      method: "GET",
      path: `/agents/approvals?organizationId=${organizationId}`,
    });
    expect(approvals.ok).toBe(true);
    if (!approvals.ok) return;
    expect(approvals.data.length).toBeGreaterThan(0);

    const resolved = await localDataProvider.request<{ readonly state: string }>({
      method: "POST",
      path: "/agents/approvals/resolve",
      body: {
        organizationId,
        approvalId: approvals.data[0].id,
        state: "APPROVED",
        decidedBy: "api-tester",
      },
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.data.state).toBe("APPROVED");
  });
});
