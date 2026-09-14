import { randomUUID } from "node:crypto";
import type { GuardianObservation } from "../types";
import { redactEvidence } from "../redact";

export type SecretFinding = {
  readonly path: string;
  readonly evidence: string;
};

export function observeSecurity(input: {
  readonly now?: () => Date;
  readonly findings?: readonly SecretFinding[];
}): readonly GuardianObservation[] {
  const now = input.now ?? (() => new Date());
  if (!input.findings || input.findings.length === 0) {
    return [
      {
        id: `gobs_${randomUUID()}`,
        source: "security",
        timestamp: now().toISOString(),
        severity: "info",
        category: "security",
        title: "No injected secret findings",
        evidence: "secret_scan_empty",
        reference: "guardian.security",
        details: { invented: false },
      },
    ];
  }
  return input.findings.map((finding) => ({
    id: `gobs_${randomUUID()}`,
    source: "security" as const,
    timestamp: now().toISOString(),
    severity: "critical" as const,
    category: "security" as const,
    title: `Possible secret in ${finding.path}`,
    evidence: redactEvidence(finding.evidence),
    reference: finding.path,
    details: { path: finding.path },
  }));
}
