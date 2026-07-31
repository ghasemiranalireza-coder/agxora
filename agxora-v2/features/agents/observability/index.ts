/**
 * AI Agent OS observability metrics.
 */

import type {
  AgentOsMetrics,
  AgentRuntime,
  AgentTask,
} from "../types";

export function computeAgentOsMetrics(
  runtimes: readonly AgentRuntime[],
  tasks: readonly AgentTask[],
  toolInvocations24h: number,
): AgentOsMetrics {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const today = tasks.filter((t) => Date.parse(t.createdAt) >= dayStart.getTime());
  const completed = today.filter((t) => t.status === "completed");
  const failed = today.filter((t) => t.status === "failed");
  const withDuration = completed.filter((t) => typeof t.durationMs === "number");
  const avgExecutionMs =
    withDuration.length === 0
      ? 0
      : Math.round(
          withDuration.reduce((s, t) => s + (t.durationMs ?? 0), 0) /
            withDuration.length,
        );

  return {
    totalAgents: runtimes.length,
    activeAgents: runtimes.filter((r) => r.status === "active" && r.enabled)
      .length,
    healthyAgents: runtimes.filter((r) => r.health === "healthy").length,
    tasksToday: today.length,
    failedToday: failed.length,
    avgExecutionMs,
    toolInvocations24h,
  };
}
