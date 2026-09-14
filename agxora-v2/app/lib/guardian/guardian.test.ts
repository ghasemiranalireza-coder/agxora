import { describe, expect, it } from "vitest";
import { runGuardian } from "./run";
import { createMemoryStore } from "./store";
import { guardianFingerprint } from "./fingerprint";
import { classifyRemediation, lowRiskDoesNotAuthorizeProduction } from "./risk";
import {
  GuardianGuardError,
  assertCannotDeploy,
  assertCannotMerge,
  assertIsolatedWorktree,
  assertNotDnsMutation,
  assertNotProductionEnvMutation,
  assertNotProductionMutation,
  GUARDIAN_AUTO_DEPLOY,
  GUARDIAN_AUTO_MERGE,
  GUARDIAN_PRODUCTION_MUTATION,
} from "./guards";
import { diagnoseIncident } from "./diagnose";
import { planRemediation } from "./remediate";
import { runValidationPipeline } from "./validate";
import { buildPullRequestSpec, forbidMergeAndDeploy } from "./pull-request";
import { redactEvidence } from "./redact";
import { createUnconfiguredRuntimeAdapter } from "./observers/runtime";
import type { GuardianIncident } from "./types";

const healthyFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      ok: true,
      status: "healthy",
      version: "0.39.0",
      runtime: "production",
    }),
    { status: 200 },
  );

function failingHealthFetch(status: number, body: unknown): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), { status });
}

describe("Guardian run lifecycle", () => {
  it("completes a dry-run observation cycle without mutating production", async () => {
    const report = await runGuardian({
      dryRun: true,
      cwd: process.cwd(),
      health: { fetchImpl: healthyFetch },
    });
    expect(report.run.status).toBe("completed");
    expect(report.run.dryRun).toBe(true);
    expect(report.productionMutated).toBe(false);
    expect(report.merged).toBe(false);
    expect(report.deployed).toBe(false);
    expect(GUARDIAN_PRODUCTION_MUTATION).toBe(false);
    expect(GUARDIAN_AUTO_MERGE).toBe(false);
    expect(GUARDIAN_AUTO_DEPLOY).toBe(false);
    expect(report.validation?.gates.test).toBe("skipped");
  });
});

describe("observation normalization", () => {
  it("records health, repository, architecture, runtime, dependency, and security observations", async () => {
    const report = await runGuardian({
      cwd: process.cwd(),
      health: { fetchImpl: healthyFetch },
    });
    const sources = new Set(report.observations.map((row) => row.source));
    expect(sources.has("production")).toBe(true);
    expect(sources.has("repository")).toBe(true);
    expect(sources.has("architecture")).toBe(true);
    expect(sources.has("runtime")).toBe(true);
    expect(sources.has("dependency")).toBe(true);
    expect(sources.has("security")).toBe(true);
    expect(report.observations.every((row) => row.timestamp && row.evidence)).toBe(true);
  });
});

describe("incident fingerprinting and duplicates", () => {
  it("uses deterministic fingerprints and upserts instead of duplicating", async () => {
    const store = createMemoryStore();
    const first = await runGuardian({
      store,
      cwd: process.cwd(),
      skipHealth: true,
      repositorySignals: { testFailures: ["suite.ts > boom"] },
    });
    const second = await runGuardian({
      store,
      cwd: process.cwd(),
      skipHealth: true,
      repositorySignals: { testFailures: ["suite.ts > boom"] },
    });
    const incidents = store.listIncidents().filter((row) => row.category === "test_failure");
    expect(incidents).toHaveLength(1);
    expect(first.incidents[0]?.fingerprint).toBe(incidents[0]?.fingerprint);
    expect(second.incidents[0]?.fingerprint).toBe(incidents[0]?.fingerprint);
    expect(incidents[0]?.firstDetectedAt).toBe(first.incidents[0]?.firstDetectedAt);
    expect(incidents[0]?.fingerprint).toBe(
      guardianFingerprint({
        category: "test_failure",
        source: "repository",
        component: "ci",
        title: "Test failures reported",
      }),
    );
  });
});

describe("diagnosis confidence", () => {
  it("never marks an unproven hypothesis as confirmed fact", () => {
    const incident: GuardianIncident = {
      fingerprint: "abc",
      severity: "high",
      category: "typecheck_failure",
      source: "repository",
      title: "Type-check failures reported",
      firstDetectedAt: "2026-09-14T00:00:00.000Z",
      lastDetectedAt: "2026-09-14T00:00:00.000Z",
      evidence: "TS2322 in adapter.ts",
      affectedComponent: "app/lib/integrations/adapter.ts",
      suspectedScope: "repository",
      status: "open",
    };
    const diagnosis = diagnoseIncident(incident);
    expect(diagnosis.rootCauseConfirmed).toBe(false);
    expect(diagnosis.confidence).toBeGreaterThan(0);
    expect(diagnosis.confidence).toBeLessThan(1);
    expect(diagnosis.hypothesis).toContain("TypeScript");
  });
});

describe("risk classification", () => {
  it("classifies SAFE test-only changes vs HIGH-RISK auth/oauth/env", () => {
    expect(
      classifyRemediation({
        files: ["app/lib/guardian/run.test.ts"],
        summary: "add missing test",
        category: "test_failure",
      }).classification,
    ).toBe("safe_auto");
    expect(
      classifyRemediation({
        files: ["app/lib/social/oauth/gmail.ts"],
        summary: "oauth redirect tweak",
        category: "regression",
      }).classification,
    ).toBe("human_review");
    expect(lowRiskDoesNotAuthorizeProduction()).toBe(true);
  });
});

describe("production mutation guards", () => {
  it("blocks production, DNS, env, main, merge, and deploy", () => {
    expect(() => assertNotProductionEnvMutation([".env.production"])).toThrow(GuardianGuardError);
    expect(() => assertNotDnsMutation(["vercel.json"])).toThrow(GuardianGuardError);
    expect(() =>
      assertNotProductionMutation({ files: ["app/page.tsx"], targetBranch: "main" }),
    ).toThrow(/main/);
    expect(() =>
      assertIsolatedWorktree({
        dryRun: false,
        applyFixes: true,
        currentBranch: "feature",
      }),
    ).toThrow(/worktree/);
    expect(() => assertCannotMerge()).toThrow(/merge/);
    expect(() => assertCannotDeploy()).toThrow(/deploy/);
    expect(() => forbidMergeAndDeploy()).toThrow(GuardianGuardError);
  });
});

describe("secret redaction", () => {
  it("redacts tokens from evidence and reports", async () => {
    expect(redactEvidence("Authorization: Bearer ya29.access-secret")).toContain("[redacted]");
    const report = await runGuardian({
      cwd: process.cwd(),
      skipHealth: true,
      secretFindings: [{ path: "leak.txt", evidence: "ya29.access-secret" }],
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("ya29.access-secret");
    expect(report.incidents.some((row) => row.category === "security")).toBe(true);
  });
});

describe("dry-run behavior", () => {
  it("does not create PRs or run mutation validation", async () => {
    const report = await runGuardian({
      cwd: process.cwd(),
      skipHealth: true,
      repositorySignals: { testFailures: ["a.test.ts"] },
      createPr: true,
      dryRun: true,
    });
    expect(report.pullRequest?.created ?? false).toBe(false);
    expect(report.pullRequest?.merged).toBeFalsy();
    expect(report.validation?.gates.build).toBe("skipped");
    expect(report.run.status).toBe("remediation_planned");
  });
});

describe("isolated worktree requirement", () => {
  it("refuses to apply fixes on main or without a worktree", async () => {
    await expect(
      runGuardian({
        dryRun: false,
        applyFixes: true,
        currentBranch: "main",
        cwd: process.cwd(),
        skipHealth: true,
      }),
    ).rejects.toMatchObject({ code: "main_mutation" });
    await expect(
      runGuardian({
        dryRun: false,
        applyFixes: true,
        currentBranch: "cursor/guardian-fix",
        cwd: process.cwd(),
        skipHealth: true,
      }),
    ).rejects.toMatchObject({ code: "worktree_required" });
  });
});

describe("validation pipeline", () => {
  it("runs gates in order and stops on failure", async () => {
    const failed = await runValidationPipeline(
      {
        test: () => true,
        "type-check": () => false,
        lint: () => true,
        build: () => true,
      },
      { dryRun: false, skipIfDryRun: false },
    );
    expect(failed.ok).toBe(false);
    expect(failed.gates.test).toBe("passed");
    expect(failed.gates["type-check"]).toBe("failed");
    expect(failed.gates.lint).toBe("skipped");
    expect(failed.evidence).toContain("type-check failed");
  });

  it("does not mark ready when a live validation gate fails", async () => {
    const report = await runGuardian({
      dryRun: false,
      applyFixes: true,
      worktreePath: "/tmp/guardian-isolated",
      currentBranch: "cursor/guardian-fix",
      cwd: process.cwd(),
      skipHealth: true,
      repositorySignals: { testFailures: ["unit"] },
      validationRunners: {
        test: () => false,
        "type-check": () => true,
        lint: () => true,
        build: () => true,
      },
    });
    expect(report.run.status).toBe("failed");
    expect(report.validation?.ok).toBe(false);
    expect(report.pullRequest?.created ?? false).toBe(false);
  });
});

describe("PR creation boundary", () => {
  it("can open a PR after validation but never merges or deploys", async () => {
    const report = await runGuardian({
      dryRun: false,
      applyFixes: true,
      worktreePath: "/tmp/guardian-isolated",
      currentBranch: "cursor/guardian-fix",
      cwd: process.cwd(),
      skipHealth: true,
      createPr: true,
      repositorySignals: { testFailures: ["unit"] },
      validationRunners: {
        test: () => true,
        "type-check": () => true,
        lint: () => true,
        build: () => true,
      },
      vcs: {
        createPullRequest: async () => ({ url: "https://example.invalid/pr/1" }),
      },
    });
    expect(report.pullRequest?.created).toBe(true);
    expect(report.pullRequest?.merged).toBe(false);
    expect(report.pullRequest?.approved).toBe(false);
    expect(report.pullRequest?.deployed).toBe(false);
    expect(report.run.status).toBe("waiting_for_approval");
    expect(report.productionMutated).toBe(false);
  });

  it("does not auto-create a PR for HIGH-RISK production health", async () => {
    let created = false;
    const report = await runGuardian({
      dryRun: false,
      applyFixes: true,
      worktreePath: "/tmp/guardian-isolated",
      currentBranch: "cursor/guardian-fix",
      cwd: process.cwd(),
      createPr: true,
      health: {
        fetchImpl: failingHealthFetch(503, { ok: false, status: "not_ready" }),
      },
      validationRunners: {
        test: () => true,
        "type-check": () => true,
        lint: () => true,
        build: () => true,
      },
      vcs: {
        createPullRequest: async () => {
          created = true;
          return { url: "https://example.invalid/pr/1" };
        },
      },
    });
    expect(created).toBe(false);
    expect(report.pullRequest?.created ?? false).toBe(false);
    expect(
      report.remediations.some(
        (row) => row.classification === "human_review" && row.allowsMerge === false,
      ),
    ).toBe(true);
  });

  it("never merges or deploys even when a PR spec is prepared", () => {
    const incident: GuardianIncident = {
      fingerprint: "fp1",
      severity: "medium",
      category: "test_failure",
      source: "repository",
      title: "Test failures reported",
      firstDetectedAt: "2026-09-14T00:00:00.000Z",
      lastDetectedAt: "2026-09-14T00:00:00.000Z",
      evidence: "expected true",
      affectedComponent: "app/lib/guardian/run.test.ts",
      suspectedScope: "repository",
      status: "open",
    };
    const diagnosis = diagnoseIncident(incident);
    const remediation = planRemediation(incident, diagnosis);
    const spec = buildPullRequestSpec({
      incident,
      diagnosis,
      remediation,
      validation: {
        ok: true,
        gates: { test: "passed", "type-check": "passed", lint: "passed", build: "passed" },
        securityReview: "passed",
        regressionReview: "passed",
        diffReview: "passed",
        evidence: "all required gates passed",
      },
    });
    expect(spec.merged).toBe(false);
    expect(spec.approved).toBe(false);
    expect(spec.deployed).toBe(false);
    expect(spec.body).toContain("rootCauseConfirmed: false");
  });
});

describe("idempotency and audit", () => {
  it("does not duplicate incidents, PRs, or identical audit events", async () => {
    const store = createMemoryStore();
    await runGuardian({
      store,
      cwd: process.cwd(),
      skipHealth: true,
      repositorySignals: { typecheckFailures: ["adapter.ts"] },
    });
    await runGuardian({
      store,
      cwd: process.cwd(),
      skipHealth: true,
      repositorySignals: { typecheckFailures: ["adapter.ts"] },
    });
    const typeIncidents = store.listIncidents().filter((row) => row.category === "typecheck_failure");
    expect(typeIncidents).toHaveLength(1);
    const incidentAudits = store.listAudit().filter((row) => row.action === "incident");
    expect(incidentAudits).toHaveLength(1);
    const prs = store.getPullRequest(typeIncidents[0]!.fingerprint);
    expect(prs?.created ?? false).toBe(false);
  });
});

describe("health observation", () => {
  it("creates a production_health incident for HTTP failures without fake success", async () => {
    const report = await runGuardian({
      cwd: process.cwd(),
      health: {
        fetchImpl: failingHealthFetch(503, { ok: false, status: "not_ready" }),
      },
    });
    expect(report.incidents.some((row) => row.category === "production_health")).toBe(true);
    expect(report.observations.some((row) => row.details.httpStatus === 503)).toBe(true);
  });
});

describe("unsupported runtime signal behavior", () => {
  it("does not invent runtime incidents when no adapter is configured", async () => {
    const adapter = createUnconfiguredRuntimeAdapter();
    expect(adapter.configured).toBe(false);
    const report = await runGuardian({
      cwd: process.cwd(),
      skipHealth: true,
      runtimeAdapter: adapter,
    });
    expect(report.observations.some((row) => row.evidence === "no_runtime_adapter")).toBe(true);
    expect(report.incidents.some((row) => row.category === "runtime_error")).toBe(false);
  });
});

describe("dependency observation", () => {
  it("inventories dependencies and keeps auto-upgrade disabled", async () => {
    const report = await runGuardian({
      cwd: process.cwd(),
      skipHealth: true,
      dependencyFindings: [
        {
          name: "left-pad",
          kind: "vulnerability",
          severity: "high",
          evidence: "advisory-demo",
        },
      ],
    });
    expect(
      report.observations.some(
        (row) => row.source === "dependency" && row.details.autoUpgrade === false,
      ),
    ).toBe(true);
    expect(report.incidents.some((row) => row.category === "dependency")).toBe(true);
    expect(
      report.remediations.find((row) => row.incidentFingerprint.includes(""))?.allowsDeploy,
    ).toBe(false);
  });
});

describe("SAFE vs HIGH-RISK remediation", () => {
  it("escalates production health to human review", async () => {
    const report = await runGuardian({
      cwd: process.cwd(),
      health: {
        fetchImpl: failingHealthFetch(200, { ok: true, status: "not_ready" }),
      },
    });
    const healthPlan = report.remediations.find((row) =>
      report.incidents.some(
        (incident) =>
          incident.fingerprint === row.incidentFingerprint &&
          incident.category === "production_health",
      ),
    );
    expect(healthPlan?.classification).toBe("human_review");
    expect(healthPlan?.allowsProductionMutation).toBe(false);
  });
});
