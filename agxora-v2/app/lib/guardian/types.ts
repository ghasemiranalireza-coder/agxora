/**
 * AGXORA Guardian domain model.
 * Engineering control plane — never a production mutation API.
 */

export const GUARDIAN_RUN_STATUSES = [
  "running",
  "detected",
  "diagnosing",
  "remediation_planned",
  "validating",
  "pr_created",
  "waiting_for_approval",
  "completed",
  "failed",
  "skipped",
] as const;

export type GuardianRunStatus = (typeof GUARDIAN_RUN_STATUSES)[number];

export const GUARDIAN_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type GuardianRiskLevel = (typeof GUARDIAN_RISK_LEVELS)[number];

export const GUARDIAN_TRIGGERS = [
  "cli",
  "scheduled",
  "ci",
  "health",
  "deployment",
  "pr",
  "manual",
] as const;
export type GuardianTrigger = (typeof GUARDIAN_TRIGGERS)[number];

export const OBSERVATION_SOURCES = [
  "production",
  "repository",
  "security",
  "runtime",
  "architecture",
  "dependency",
] as const;
export type ObservationSource = (typeof OBSERVATION_SOURCES)[number];

export const OBSERVATION_SEVERITIES = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type ObservationSeverity = (typeof OBSERVATION_SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  "production_health",
  "runtime_error",
  "test_failure",
  "build_failure",
  "typecheck_failure",
  "lint_failure",
  "security",
  "dependency",
  "integration",
  "architecture",
  "regression",
  "configuration",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATUSES = [
  "open",
  "acknowledged",
  "planned",
  "resolved",
  "duplicate",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const REMEDIATION_CLASSES = ["safe_auto", "human_review"] as const;
export type RemediationClass = (typeof REMEDIATION_CLASSES)[number];

export type GuardianObservation = {
  readonly id: string;
  readonly source: ObservationSource;
  readonly timestamp: string;
  readonly severity: ObservationSeverity;
  readonly category: IncidentCategory;
  readonly title: string;
  readonly evidence: string;
  readonly reference?: string;
  readonly details: Record<string, unknown>;
};

export type GuardianIncident = {
  readonly fingerprint: string;
  readonly severity: ObservationSeverity;
  readonly category: IncidentCategory;
  readonly source: ObservationSource;
  readonly title: string;
  readonly firstDetectedAt: string;
  readonly lastDetectedAt: string;
  readonly evidence: string;
  readonly affectedComponent: string;
  readonly suspectedScope: string;
  readonly status: IncidentStatus;
};

export type GuardianDiagnosis = {
  readonly incidentFingerprint: string;
  readonly evidence: readonly string[];
  readonly hypothesis: string;
  readonly confidence: number;
  readonly affectedFiles: readonly string[];
  readonly probableRootCause: string;
  readonly rootCauseConfirmed: boolean;
};

export type GuardianRemediation = {
  readonly incidentFingerprint: string;
  readonly classification: RemediationClass;
  readonly riskLevel: GuardianRiskLevel;
  readonly summary: string;
  readonly proposedFiles: readonly string[];
  readonly requiresIsolatedWorktree: true;
  readonly allowsProductionMutation: false;
  readonly allowsMerge: false;
  readonly allowsDeploy: false;
};

export type GuardianValidationGate = "test" | "type-check" | "lint" | "build";

export type GuardianValidation = {
  readonly ok: boolean;
  readonly gates: Readonly<Record<GuardianValidationGate, "passed" | "failed" | "skipped">>;
  readonly securityReview: "passed" | "failed" | "skipped";
  readonly regressionReview: "passed" | "failed" | "skipped";
  readonly diffReview: "passed" | "failed" | "skipped";
  readonly evidence: string;
};

export type GuardianPullRequest = {
  readonly incidentFingerprint: string;
  readonly title: string;
  readonly body: string;
  readonly branch: string;
  readonly created: boolean;
  readonly merged: false;
  readonly approved: false;
  readonly deployed: false;
};

export type GuardianAuditEvent = {
  readonly id: string;
  readonly at: string;
  readonly action: string;
  readonly fingerprint?: string;
  readonly details: Record<string, unknown>;
};

export type GuardianRun = {
  readonly id: string;
  readonly startedAt: string;
  completedAt: string | null;
  readonly trigger: GuardianTrigger;
  status: GuardianRunStatus;
  summary: string;
  riskLevel: GuardianRiskLevel;
  readonly dryRun: boolean;
};

export type GuardianRunReport = {
  readonly run: GuardianRun;
  readonly durationMs: number;
  readonly observations: readonly GuardianObservation[];
  readonly incidents: readonly GuardianIncident[];
  readonly diagnoses: readonly GuardianDiagnosis[];
  readonly remediations: readonly GuardianRemediation[];
  readonly validation: GuardianValidation | null;
  readonly pullRequest: GuardianPullRequest | null;
  readonly audit: readonly GuardianAuditEvent[];
  readonly productionMutated: false;
  readonly merged: false;
  readonly deployed: false;
};
