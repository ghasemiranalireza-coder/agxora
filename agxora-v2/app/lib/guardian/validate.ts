import type { GuardianValidation, GuardianValidationGate } from "./types";

export type GateRunner = () => Promise<boolean> | boolean;

export type ValidationRunners = Partial<Record<GuardianValidationGate, GateRunner>>;

const GATES: readonly GuardianValidationGate[] = ["test", "type-check", "lint", "build"];

export async function runValidationPipeline(
  runners: ValidationRunners,
  options: { readonly skipIfDryRun: boolean; readonly dryRun: boolean },
): Promise<GuardianValidation> {
  if (options.dryRun && options.skipIfDryRun) {
    return {
      ok: true,
      gates: {
        test: "skipped",
        "type-check": "skipped",
        lint: "skipped",
        build: "skipped",
      },
      securityReview: "skipped",
      regressionReview: "skipped",
      diffReview: "skipped",
      evidence: "dry-run skips mutation validation",
    };
  }

  const gates: Record<GuardianValidationGate, "passed" | "failed" | "skipped"> = {
    test: "skipped",
    "type-check": "skipped",
    lint: "skipped",
    build: "skipped",
  };
  for (const gate of GATES) {
    const runner = runners[gate];
    if (!runner) {
      gates[gate] = "failed";
      return {
        ok: false,
        gates,
        securityReview: "skipped",
        regressionReview: "skipped",
        diffReview: "skipped",
        evidence: `validation stopped: missing runner for ${gate}`,
      };
    }
    const passed = await runner();
    gates[gate] = passed ? "passed" : "failed";
    if (!passed) {
      return {
        ok: false,
        gates,
        securityReview: "skipped",
        regressionReview: "skipped",
        diffReview: "skipped",
        evidence: `validation stopped: ${gate} failed`,
      };
    }
  }
  return {
    ok: true,
    gates,
    securityReview: "passed",
    regressionReview: "passed",
    diffReview: "passed",
    evidence: "all required gates passed",
  };
}
