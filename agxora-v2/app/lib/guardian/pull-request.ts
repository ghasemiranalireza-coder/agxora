import type {
  GuardianDiagnosis,
  GuardianIncident,
  GuardianPullRequest,
  GuardianRemediation,
  GuardianValidation,
} from "./types";
import { guardianRedact } from "./redact";
import { assertCannotDeploy, assertCannotMerge } from "./guards";
import type { GuardianStore } from "./store";

export type GuardianVcsPort = {
  readonly createPullRequest?: (spec: GuardianPullRequest) => Promise<{ readonly url: string }>;
};

export function buildPullRequestSpec(input: {
  readonly incident: GuardianIncident;
  readonly diagnosis: GuardianDiagnosis;
  readonly remediation: GuardianRemediation;
  readonly validation: GuardianValidation;
}): GuardianPullRequest {
  const body = [
    "## Incident",
    input.incident.title,
    `fingerprint: ${input.incident.fingerprint}`,
    `category: ${input.incident.category}`,
    `evidence: ${input.incident.evidence}`,
    "",
    "## Diagnosis",
    `hypothesis: ${input.diagnosis.hypothesis}`,
    `confidence: ${input.diagnosis.confidence}`,
    `rootCauseConfirmed: ${String(input.diagnosis.rootCauseConfirmed)}`,
    "",
    "## Remediation",
    input.remediation.summary,
    `risk: ${input.remediation.riskLevel}`,
    `classification: ${input.remediation.classification}`,
    `files: ${input.remediation.proposedFiles.join(", ") || "(none)"}`,
    "",
    "## Validation",
    input.validation.evidence,
    "",
    "## Security",
    "Guardian does not modify production, merge, or deploy.",
    `allowsMerge: ${String(input.remediation.allowsMerge)}`,
    `allowsDeploy: ${String(input.remediation.allowsDeploy)}`,
  ].join("\n");

  return guardianRedact({
    incidentFingerprint: input.incident.fingerprint,
    title: `Guardian: ${input.incident.title}`,
    body,
    branch: `cursor/guardian-${input.incident.fingerprint.slice(0, 12)}`,
    created: false,
    merged: false,
    approved: false,
    deployed: false,
  });
}

export async function maybeCreatePullRequest(input: {
  readonly store: GuardianStore;
  readonly spec: GuardianPullRequest;
  readonly dryRun: boolean;
  readonly createPr: boolean;
  readonly validationOk: boolean;
  readonly classification: "safe_auto" | "human_review";
  readonly vcs?: GuardianVcsPort;
}): Promise<GuardianPullRequest> {
  const existing = input.store.getPullRequest(input.spec.incidentFingerprint);
  if (existing) return existing;
  if (input.dryRun || !input.createPr || !input.validationOk) {
    return input.store.putPullRequest(input.spec);
  }
  if (input.classification !== "safe_auto") {
    return input.store.putPullRequest(input.spec);
  }
  if (!input.vcs?.createPullRequest) {
    return input.store.putPullRequest(input.spec);
  }
  await input.vcs.createPullRequest(input.spec);
  return input.store.putPullRequest({ ...input.spec, created: true });
}

export function forbidMergeAndDeploy(): void {
  assertCannotMerge();
}

export function forbidDeploy(): void {
  assertCannotDeploy();
}
