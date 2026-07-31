/**
 * Automation analytics derived from store snapshots.
 */

import type { AutomationAnalytics, WorkflowDefinition, WorkflowExecution } from "../types";

export function computeAutomationAnalytics(
  workflows: readonly WorkflowDefinition[],
  executions: readonly WorkflowExecution[],
): AutomationAnalytics {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const today = executions.filter(
    (e) => Date.parse(e.startedAt) >= startOfDay.getTime(),
  );
  const last24 = executions.filter((e) => Date.parse(e.startedAt) >= dayAgo);
  const succeeded = last24.filter((e) => e.status === "succeeded").length;
  const failed = last24.filter((e) => e.status === "failed").length;
  const withDuration = last24.filter((e) => typeof e.durationMs === "number");
  const avgDurationMs =
    withDuration.length === 0
      ? 0
      : Math.round(
          withDuration.reduce((s, e) => s + (e.durationMs ?? 0), 0) /
            withDuration.length,
        );

  return {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter((w) => w.status === "active").length,
    executionsToday: today.length,
    successRate:
      last24.length === 0
        ? 100
        : Math.round((succeeded / last24.length) * 1000) / 10,
    failedLast24h: failed,
    avgDurationMs,
  };
}
