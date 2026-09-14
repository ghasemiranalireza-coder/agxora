import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GuardianObservation } from "../types";

export type RepositorySignals = {
  readonly testFailures?: readonly string[];
  readonly typecheckFailures?: readonly string[];
  readonly lintFailures?: readonly string[];
  readonly buildFailures?: readonly string[];
};

export function observeRepository(input: {
  readonly cwd: string;
  readonly now?: () => Date;
  readonly signals?: RepositorySignals;
}): readonly GuardianObservation[] {
  const now = input.now ?? (() => new Date());
  const observations: GuardianObservation[] = [];
  const pkgPath = join(input.cwd, "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};
  const required = ["test", "type-check", "lint", "build"] as const;
  const missing = required.filter((name) => !scripts[name]);
  if (missing.length > 0) {
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "repository",
      timestamp: now().toISOString(),
      severity: "high",
      category: "architecture",
      title: "Quality gate scripts missing",
      evidence: `missing=${missing.join(",")}`,
      reference: "package.json",
      details: { missing: [...missing] },
    });
  } else {
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "repository",
      timestamp: now().toISOString(),
      severity: "info",
      category: "architecture",
      title: "Quality gate scripts present",
      evidence: "test,type-check,lint,build",
      reference: "package.json",
      details: { gates: [...required] },
    });
  }

  const failures: Array<{
    readonly list: readonly string[] | undefined;
    readonly category: GuardianObservation["category"];
    readonly title: string;
  }> = [
    { list: input.signals?.testFailures, category: "test_failure", title: "Test failures reported" },
    {
      list: input.signals?.typecheckFailures,
      category: "typecheck_failure",
      title: "Type-check failures reported",
    },
    { list: input.signals?.lintFailures, category: "lint_failure", title: "Lint failures reported" },
    { list: input.signals?.buildFailures, category: "build_failure", title: "Build failures reported" },
  ];
  for (const item of failures) {
    if (!item.list || item.list.length === 0) continue;
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "repository",
      timestamp: now().toISOString(),
      severity: "high",
      category: item.category,
      title: item.title,
      evidence: item.list.join("; "),
      reference: "ci",
      details: { count: item.list.length },
    });
  }
  return observations;
}
