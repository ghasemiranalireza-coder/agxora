import { randomUUID } from "node:crypto";
import type {
  GuardianObservation,
  GuardianRun,
  GuardianRunReport,
  GuardianRunStatus,
  GuardianTrigger,
  GuardianRiskLevel,
} from "./types";
import { createMemoryStore, type GuardianStore } from "./store";
import { recordGuardianAudit } from "./audit";
import { observeProductionHealth, type HealthObserverDeps } from "./observers/health";
import { observeRepository, type RepositorySignals } from "./observers/repository";
import { observeArchitecture } from "./observers/architecture";
import { observeRuntimeErrors, type RuntimeErrorAdapter } from "./observers/runtime";
import { observeDependencies, type DependencyFinding } from "./observers/dependencies";
import { observeSecurity, type SecretFinding } from "./observers/security";
import { observationsToIncidents } from "./detect";
import { diagnoseIncident } from "./diagnose";
import { planRemediation } from "./remediate";
import { runValidationPipeline, type ValidationRunners } from "./validate";
import { buildPullRequestSpec, maybeCreatePullRequest, type GuardianVcsPort } from "./pull-request";
import {
  assertIsolatedWorktree,
  assertNotProductionMutation,
  GUARDIAN_AUTO_DEPLOY,
  GUARDIAN_AUTO_MERGE,
  GUARDIAN_PRODUCTION_MUTATION,
} from "./guards";
import { guardianRedact } from "./redact";
import { severityToRisk } from "./risk";

export type GuardianRunOptions = {
  readonly dryRun?: boolean;
  readonly trigger?: GuardianTrigger;
  readonly cwd?: string;
  readonly store?: GuardianStore;
  readonly health?: HealthObserverDeps;
  readonly skipHealth?: boolean;
  readonly repositorySignals?: RepositorySignals;
  readonly runtimeAdapter?: RuntimeErrorAdapter;
  readonly dependencyFindings?: readonly DependencyFinding[];
  readonly secretFindings?: readonly SecretFinding[];
  readonly applyFixes?: boolean;
  readonly worktreePath?: string;
  readonly currentBranch?: string;
  readonly createPr?: boolean;
  readonly validationRunners?: ValidationRunners;
  readonly vcs?: GuardianVcsPort;
  readonly now?: () => Date;
};

function peakRisk(levels: readonly GuardianRiskLevel[]): GuardianRiskLevel {
  const order: GuardianRiskLevel[] = ["low", "medium", "high", "critical"];
  let peak: GuardianRiskLevel = "low";
  for (const level of levels) {
    if (order.indexOf(level) > order.indexOf(peak)) peak = level;
  }
  return peak;
}

function statusAfter(input: {
  readonly incidentCount: number;
  readonly dryRun: boolean;
  readonly validationOk: boolean | null;
  readonly prCreated: boolean;
}): GuardianRunStatus {
  if (input.incidentCount === 0) return "completed";
  if (input.dryRun) return "remediation_planned";
  if (input.validationOk === false) return "failed";
  if (input.prCreated) return "waiting_for_approval";
  return "completed";
}

export async function runGuardian(
  options: GuardianRunOptions = {},
): Promise<GuardianRunReport> {
  const dryRun = options.dryRun !== false;
  const now = options.now ?? (() => new Date());
  const started = now();
  const store = options.store ?? createMemoryStore();
  const cwd = options.cwd ?? process.cwd();
  const run: GuardianRun = {
    id: `grd_${randomUUID()}`,
    startedAt: started.toISOString(),
    completedAt: null,
    trigger: options.trigger ?? "cli",
    status: "running",
    summary: "",
    riskLevel: "low",
    dryRun,
  };

  assertIsolatedWorktree({
    dryRun,
    applyFixes: options.applyFixes === true,
    worktreePath: options.worktreePath,
    currentBranch: options.currentBranch,
  });

  recordGuardianAudit(store, {
    action: "run_started",
    details: { runId: run.id, dryRun, trigger: run.trigger },
    at: run.startedAt,
  });

  const observations: GuardianObservation[] = [];
  if (!options.skipHealth) {
    observations.push(...(await observeProductionHealth(options.health)));
  }
  observations.push(...observeRepository({ cwd, now, signals: options.repositorySignals }));
  observations.push(...observeArchitecture(now));
  observations.push(...(await observeRuntimeErrors(options.runtimeAdapter, now)));
  observations.push(...observeDependencies({ cwd, now, findings: options.dependencyFindings }));
  observations.push(...observeSecurity({ now, findings: options.secretFindings }));

  for (const observation of observations) {
    recordGuardianAudit(store, {
      action: "observation",
      fingerprint: `${observation.source}:${observation.category}:${observation.title}`,
      details: { source: observation.source, category: observation.category, severity: observation.severity },
    });
  }

  run.status = "detected";
  const incidents = observationsToIncidents(observations, store, now());
  for (const incident of incidents) {
    recordGuardianAudit(store, {
      action: "incident",
      fingerprint: incident.fingerprint,
      details: { category: incident.category, status: incident.status },
    });
  }

  run.status = "diagnosing";
  const diagnoses = incidents.map(diagnoseIncident);
  for (const diagnosis of diagnoses) {
    recordGuardianAudit(store, {
      action: "diagnosis",
      fingerprint: diagnosis.incidentFingerprint,
      details: {
        confidence: diagnosis.confidence,
        rootCauseConfirmed: diagnosis.rootCauseConfirmed,
      },
    });
  }

  run.status = "remediation_planned";
  const remediations = incidents.map((incident, index) => {
    const plan = planRemediation(incident, diagnoses[index]!);
    recordGuardianAudit(store, {
      action: "remediation_plan",
      fingerprint: incident.fingerprint,
      details: {
        classification: plan.classification,
        riskLevel: plan.riskLevel,
        allowsMerge: plan.allowsMerge,
        allowsDeploy: plan.allowsDeploy,
      },
    });
    if (!dryRun && options.applyFixes) {
      assertNotProductionMutation({
        files: plan.proposedFiles,
        cwd: options.worktreePath ?? cwd,
        targetBranch: options.currentBranch,
      });
    }
    return plan;
  });

  const applyingFixes = !dryRun && options.applyFixes === true;
  const hasSafeAuto = remediations.some((item) => item.classification === "safe_auto");
  let validation = await runValidationPipeline(options.validationRunners ?? {}, {
    dryRun: true,
    skipIfDryRun: true,
  });
  if (applyingFixes && hasSafeAuto) {
    run.status = "validating";
    validation = await runValidationPipeline(options.validationRunners ?? {}, {
      dryRun: false,
      skipIfDryRun: false,
    });
  }
  recordGuardianAudit(store, {
    action: "validation",
    details: { ok: validation.ok, evidence: validation.evidence, dryRun: !applyingFixes || !hasSafeAuto },
  });

  let pullRequest = null;
  const firstSafe = remediations.find((item) => item.classification === "safe_auto");
  if (firstSafe && validation.ok) {
    const incident = incidents.find((row) => row.fingerprint === firstSafe.incidentFingerprint);
    const diagnosis = diagnoses.find((row) => row.incidentFingerprint === firstSafe.incidentFingerprint);
    if (incident && diagnosis) {
      const spec = buildPullRequestSpec({
        incident,
        diagnosis,
        remediation: firstSafe,
        validation,
      });
      pullRequest = await maybeCreatePullRequest({
        store,
        spec,
        dryRun,
        createPr: options.createPr === true,
        validationOk: validation.ok,
        classification: firstSafe.classification,
        vcs: options.vcs,
      });
      recordGuardianAudit(store, {
        action: "pull_request",
        fingerprint: incident.fingerprint,
        details: {
          created: pullRequest.created,
          merged: pullRequest.merged,
          approved: pullRequest.approved,
          deployed: pullRequest.deployed,
        },
      });
    }
  }

  if (!validation.ok && !dryRun && options.applyFixes) {
    run.status = "failed";
    run.summary = validation.evidence;
  } else {
    run.status = statusAfter({
      incidentCount: incidents.length,
      dryRun,
      validationOk: validation.ok,
      prCreated: pullRequest?.created === true,
    });
    run.summary =
      incidents.length === 0
        ? "No incidents. Guardian did not invent activity."
        : `${incidents.length} incident(s); dryRun=${String(dryRun)}; merge=${String(GUARDIAN_AUTO_MERGE)}; deploy=${String(GUARDIAN_AUTO_DEPLOY)}`;
  }

  run.riskLevel = peakRisk([
    ...incidents.map((incident) => severityToRisk(incident.severity)),
    ...remediations.map((item) => item.riskLevel),
  ]);
  const completed = now();
  run.completedAt = completed.toISOString();
  recordGuardianAudit(store, {
    action: "run_completed",
    details: {
      runId: run.id,
      status: run.status,
      productionMutated: GUARDIAN_PRODUCTION_MUTATION,
    },
    at: run.completedAt,
  });

  return guardianRedact({
    run,
    durationMs: Math.max(0, completed.getTime() - started.getTime()),
    observations,
    incidents,
    diagnoses,
    remediations,
    validation,
    pullRequest,
    audit: store.listAudit(),
    productionMutated: false,
    merged: false,
    deployed: false,
  });
}
