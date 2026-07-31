/**
 * Field mapping — transformation rules, defaults, validation, scripting placeholder.
 */

import type { FieldMappingRule } from "../types";

export function applyTransform(
  value: unknown,
  rule: FieldMappingRule,
): unknown {
  if (value == null || value === "") {
    if (rule.defaultValue !== undefined) return rule.defaultValue;
    if (rule.required) {
      throw new Error(`Required field missing: ${rule.sourceField}`);
    }
    return value;
  }

  switch (rule.transform ?? "none") {
    case "uppercase":
      return String(value).toUpperCase();
    case "lowercase":
      return String(value).toLowerCase();
    case "trim":
      return String(value).trim();
    case "default":
      return value ?? rule.defaultValue;
    case "custom":
      // Future custom scripting hook
      void rule.customScriptPlaceholder;
      return value;
    case "none":
    default:
      return value;
  }
}

export function mapRecord(
  source: Readonly<Record<string, unknown>>,
  rules: readonly FieldMappingRule[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const rule of rules) {
    out[rule.targetField] = applyTransform(source[rule.sourceField], rule);
  }
  return out;
}

export function validateMappingRules(
  rules: readonly FieldMappingRule[],
): readonly string[] {
  const errors: string[] = [];
  const targets = new Set<string>();
  for (const rule of rules) {
    if (!rule.sourceField || !rule.targetField) {
      errors.push(`Invalid rule ${rule.id}: empty source/target`);
    }
    if (targets.has(rule.targetField)) {
      errors.push(`Duplicate target field: ${rule.targetField}`);
    }
    targets.add(rule.targetField);
  }
  return errors;
}
