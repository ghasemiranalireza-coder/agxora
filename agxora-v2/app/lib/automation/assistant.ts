import type { AssistantSuggestion, WorkflowDefinition, WorkflowScore } from "./types";

/** Placeholder AI assistant — deterministic local heuristics only. */
export function scoreWorkflow(workflow: WorkflowDefinition): WorkflowScore {
  const suggestions: AssistantSuggestion[] = [];
  const hasApproval = workflow.nodes.some((n) => n.type === "approval");
  const hasDelay = workflow.nodes.some((n) => n.type === "delay");
  const triggers = workflow.nodes.filter((n) => n.type === "trigger");
  const labels = new Map<string, number>();
  for (const node of workflow.nodes) {
    labels.set(node.label, (labels.get(node.label) ?? 0) + 1);
  }

  if (!hasApproval && workflow.nodes.length > 4) {
    suggestions.push({
      id: "sug-approval",
      title: "Missing Approval",
      description: "Longer flows often benefit from an approval gate before side effects.",
      severity: "warning",
      kind: "missing_approval",
    });
  }
  if (!hasDelay && workflow.nodes.some((n) => n.catalogId.includes("email"))) {
    suggestions.push({
      id: "sug-delay",
      title: "Possible Delay",
      description: "Consider a delay before reminder emails to avoid noisy bursts.",
      severity: "info",
      kind: "possible_delay",
    });
  }
  if (triggers.length === 0) {
    suggestions.push({
      id: "sug-trigger",
      title: "Unused Trigger",
      description: "This graph has no start trigger — add one before activation.",
      severity: "critical",
      kind: "unused_trigger",
    });
  }
  for (const [label, count] of labels) {
    if (count > 1) {
      suggestions.push({
        id: `sug-dup-${label}`,
        title: "Duplicate Nodes",
        description: `“${label}” appears ${count} times — consolidate if redundant.`,
        severity: "warning",
        kind: "duplicate_nodes",
      });
      break;
    }
  }
  const orphanActions = workflow.nodes.filter(
    (n) =>
      (n.type === "action" || n.type === "ai_action") &&
      !workflow.edges.some((e) => e.from === n.id || e.to === n.id),
  );
  if (orphanActions.length > 0) {
    suggestions.push({
      id: "sug-unused-action",
      title: "Unused Action",
      description: `${orphanActions[0].label} is not connected — wire or remove it.`,
      severity: "warning",
      kind: "unused_action",
    });
  }
  suggestions.push({
    id: "sug-security",
    title: "Security Recommendation",
    description: "Prefer least-privilege adapters for webhook and email actions.",
    severity: "opportunity",
    kind: "security",
  });
  suggestions.push({
    id: "sug-perf",
    title: "Performance Recommendation",
    description: "Batch AI steps where possible to reduce average execution time.",
    severity: "info",
    kind: "performance",
  });

  let score = 92;
  score -= suggestions.filter((s) => s.severity === "critical").length * 12;
  score -= suggestions.filter((s) => s.severity === "warning").length * 4;
  score = Math.max(40, Math.min(99, score));

  return {
    score,
    label: score >= 85 ? "Healthy" : score >= 70 ? "Needs attention" : "At risk",
    suggestions,
  };
}
