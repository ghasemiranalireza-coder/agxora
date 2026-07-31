/**
 * Condition evaluation engine.
 */

import type { ConditionOperator, ConditionRule } from "../types";

function resolvePath(
  source: Readonly<Record<string, unknown>>,
  path: string,
): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur: unknown = source;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function evaluateOperator(
  operator: ConditionOperator,
  left: unknown,
  right: unknown,
): boolean {
  switch (operator) {
    case "equals":
      return left === right || String(left) === String(right);
    case "contains":
      return String(left ?? "").includes(String(right ?? ""));
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "empty":
      return (
        left == null ||
        left === "" ||
        (Array.isArray(left) && left.length === 0)
      );
    case "boolean":
      return Boolean(left) === Boolean(right ?? true);
    case "date": {
      const l = Date.parse(String(left ?? ""));
      const r = Date.parse(String(right ?? ""));
      return !Number.isNaN(l) && !Number.isNaN(r) && l === r;
    }
    case "status":
      return String(left ?? "").toLowerCase() === String(right ?? "").toLowerCase();
    case "custom":
      // Placeholder for expression engine / future rules DSL.
      return Boolean(left);
    default:
      return false;
  }
}

export function evaluateRule(
  rule: ConditionRule,
  context: Readonly<Record<string, unknown>>,
): boolean {
  const left = resolvePath(context, rule.field);
  if (rule.operator === "custom" && rule.customExpression) {
    return Boolean(left) || rule.customExpression.length > 0;
  }
  return evaluateOperator(rule.operator, left, rule.value);
}

export function evaluateRules(
  rules: readonly ConditionRule[],
  logic: "and" | "or",
  context: Readonly<Record<string, unknown>>,
): boolean {
  if (rules.length === 0) return true;
  if (logic === "or") {
    return rules.some((r) => evaluateRule(r, context));
  }
  return rules.every((r) => evaluateRule(r, context));
}
