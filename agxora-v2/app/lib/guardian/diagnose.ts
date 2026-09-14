import type { GuardianDiagnosis, GuardianIncident } from "./types";

export function diagnoseIncident(incident: GuardianIncident): GuardianDiagnosis {
  const confirmed = false;
  const confidence = confidenceFor(incident);
  return {
    incidentFingerprint: incident.fingerprint,
    evidence: [incident.evidence],
    hypothesis: hypothesisFor(incident),
    confidence,
    affectedFiles: filesFor(incident),
    probableRootCause: incident.evidence,
    rootCauseConfirmed: confirmed,
  };
}

function confidenceFor(incident: GuardianIncident): number {
  if (incident.category === "test_failure" || incident.category === "typecheck_failure") {
    return 0.72;
  }
  if (incident.category === "production_health") return 0.55;
  if (incident.severity === "critical") return 0.6;
  return 0.4;
}

function hypothesisFor(incident: GuardianIncident): string {
  switch (incident.category) {
    case "production_health":
      return "Production health reports a non-healthy readiness state. Configuration or deployment identity may be involved.";
    case "test_failure":
      return "A local or CI test failed. Likely a code regression in the reported suite.";
    case "typecheck_failure":
      return "TypeScript types drifted from implementation.";
    case "integration":
      return "Canonical provider registry drifted from the production Gmail/YouTube contract.";
    case "security":
      return "A secret-like value was observed and must be reviewed by a human.";
    default:
      return "An observation crossed the incident threshold and needs human-reviewed diagnosis.";
  }
}

function filesFor(incident: GuardianIncident): readonly string[] {
  if (incident.affectedComponent.endsWith(".ts") || incident.affectedComponent.endsWith(".tsx")) {
    return [incident.affectedComponent];
  }
  if (incident.category === "integration") {
    return ["app/lib/integrations/registry.ts"];
  }
  return [];
}
