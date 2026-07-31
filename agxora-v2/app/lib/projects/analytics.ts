/**
 * Project analytics — pure functions over loaded data.
 */

import type {
  ProjectRecord,
  TaskRecord,
} from "./types";

export type ProjectAnalytics = {
  readonly total: number;
  readonly active: number;
  readonly completed: number;
  readonly onHold: number;
  readonly archived: number;
  readonly planning: number;
  readonly completedPercent: number;
  readonly totalBudget: number;
  readonly totalSpent: number;
  readonly budgetUsagePercent: number;
  readonly openTasks: number;
  readonly overdueTasks: number;
  readonly upcomingDeadlines: readonly {
    readonly id: string;
    readonly name: string;
    readonly dueDate: string;
    readonly status: string;
    readonly kind: "project" | "task";
  }[];
  readonly teamMembers: number;
  readonly healthScore: number;
  readonly statusBreakdown: readonly {
    readonly status: string;
    readonly count: number;
    readonly percent: number;
  }[];
};

function daysFromToday(isoDate: string): number | null {
  if (!isoDate) return null;
  const target = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((target.getTime() - start) / 86_400_000);
}

export function computeProjectAnalytics(
  projects: readonly ProjectRecord[],
  tasks: readonly TaskRecord[] = [],
): ProjectAnalytics {
  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const onHold = projects.filter((p) => p.status === "on_hold").length;
  const archived = projects.filter((p) => p.status === "archived").length;
  const planning = projects.filter((p) => p.status === "planning").length;

  const completedPercent =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
  const budgetUsagePercent =
    totalBudget <= 0 ? 0 : Math.round((totalSpent / totalBudget) * 100);

  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "done" || !t.dueDate) return false;
    const days = daysFromToday(t.dueDate);
    return days !== null && days < 0;
  }).length;

  const memberKeys = new Set<string>();
  for (const project of projects) {
    for (const member of project.members) {
      memberKeys.add(member.email || member.id || member.name);
    }
  }

  const upcomingProjects = projects
    .filter((p) => p.dueDate && p.status !== "completed" && p.status !== "archived")
    .map((p) => ({
      id: p.id,
      name: p.name,
      dueDate: p.dueDate,
      status: p.status,
      kind: "project" as const,
      days: daysFromToday(p.dueDate) ?? 9999,
    }))
    .filter((p) => p.days >= 0 && p.days <= 30);

  const upcomingTasks = tasks
    .filter((t) => t.dueDate && t.status !== "done")
    .map((t) => ({
      id: t.id,
      name: t.title,
      dueDate: t.dueDate,
      status: t.status,
      kind: "task" as const,
      days: daysFromToday(t.dueDate) ?? 9999,
    }))
    .filter((t) => t.days >= 0 && t.days <= 14);

  const upcomingDeadlines = [...upcomingProjects, ...upcomingTasks]
    .sort((a, b) => a.days - b.days || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      name: item.name,
      dueDate: item.dueDate,
      status: item.status,
      kind: item.kind,
    }));

  const avgProgress =
    total === 0
      ? 0
      : projects.reduce((sum, p) => sum + p.progress, 0) / total;
  const overduePenalty = Math.min(40, overdueTasks * 5);
  const holdPenalty = Math.min(20, onHold * 4);
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(avgProgress - overduePenalty - holdPenalty + completedPercent * 0.15)),
  );

  const statusBreakdown = (
    [
      ["active", active],
      ["completed", completed],
      ["on_hold", onHold],
      ["planning", planning],
      ["archived", archived],
    ] as const
  ).map(([status, count]) => ({
    status,
    count,
    percent: total === 0 ? 0 : Math.round((count / total) * 100),
  }));

  return {
    total,
    active,
    completed,
    onHold,
    archived,
    planning,
    completedPercent,
    totalBudget,
    totalSpent,
    budgetUsagePercent,
    openTasks,
    overdueTasks,
    upcomingDeadlines,
    teamMembers: memberKeys.size,
    healthScore,
    statusBreakdown,
  };
}

export function formatMoney(
  amount: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en")}`;
  }
}
