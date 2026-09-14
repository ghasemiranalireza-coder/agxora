import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GuardianObservation } from "../types";

export type DependencyFinding = {
  readonly name: string;
  readonly kind: "outdated" | "vulnerability" | "unexpected_add" | "lockfile";
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
  readonly evidence: string;
};

export function observeDependencies(input: {
  readonly cwd: string;
  readonly now?: () => Date;
  readonly findings?: readonly DependencyFinding[];
}): readonly GuardianObservation[] {
  const now = input.now ?? (() => new Date());
  const pkg = JSON.parse(readFileSync(join(input.cwd, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const observations: GuardianObservation[] = [
    {
      id: `gobs_${randomUUID()}`,
      source: "dependency",
      timestamp: now().toISOString(),
      severity: "info",
      category: "dependency",
      title: "Dependency inventory observed",
      evidence: `dependencies=${Object.keys(pkg.dependencies ?? {}).length} devDependencies=${Object.keys(pkg.devDependencies ?? {}).length}`,
      reference: "package.json",
      details: {
        dependencyCount: Object.keys(pkg.dependencies ?? {}).length,
        devDependencyCount: Object.keys(pkg.devDependencies ?? {}).length,
        autoUpgrade: false,
      },
    },
  ];
  for (const finding of input.findings ?? []) {
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "dependency",
      timestamp: now().toISOString(),
      severity: finding.severity,
      category: "dependency",
      title: `Dependency ${finding.kind}: ${finding.name}`,
      evidence: finding.evidence,
      reference: finding.name,
      details: { kind: finding.kind, autoUpgrade: false },
    });
  }
  return observations;
}
