import type { GuardianDiagnosis, GuardianIncident, GuardianRemediation } from "./types";
import { classifyRemediation } from "./risk";

export function planRemediation(
  incident: GuardianIncident,
  diagnosis: GuardianDiagnosis,
): GuardianRemediation {
  const classified = classifyRemediation({
    files: diagnosis.affectedFiles,
    summary: diagnosis.hypothesis,
    category: incident.category,
  });
  return {
    incidentFingerprint: incident.fingerprint,
    classification: classified.classification,
    riskLevel: classified.riskLevel,
    summary:
      classified.classification === "safe_auto"
        ? `SAFE auto-fix candidate for ${incident.title} (isolated worktree only)`
        : `HIGH-RISK / human review required for ${incident.title}`,
    proposedFiles: diagnosis.affectedFiles,
    requiresIsolatedWorktree: true,
    allowsProductionMutation: false,
    allowsMerge: false,
    allowsDeploy: false,
  };
}
