/**
 * Guardian CLI — observation/analysis cycle.
 * Default: dry-run. Never modifies production, never merges, never deploys.
 */

import { runGuardian } from "../../app/lib/guardian/run";
import { DEFAULT_HEALTH_URL } from "../../app/lib/guardian/observers/health";

function hasFlag(argv: readonly string[], name: string): boolean {
  return argv.includes(name);
}

function flagValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  return argv[index + 1];
}

function printHelp(): void {
  const text = [
    "AGXORA Guardian",
    "",
    "Usage:",
    "  npm run guardian",
    "  npm run guardian:check",
    "  npx tsx scripts/guardian/cli.ts check --dry-run",
    "",
    "Options:",
    "  --dry-run          Observe/diagnose/plan only (default)",
    "  --json             Print JSON report",
    "  --skip-health      Do not call the production health endpoint",
    "  --health-url URL   Override health URL (GET only)",
    "",
    "Guardian does not modify production, merge PRs, or deploy.",
    "",
  ].join("\n");
  process.stdout.write(text);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || argv[0] === "help") {
    printHelp();
    return;
  }
  const command = argv[0] === "check" || argv[0] === "remediate" ? argv[0] : "check";
  if (command === "remediate") {
    process.stderr.write(
      "Guardian remediate is not enabled without an isolated worktree and explicit human-operated flags. Use check --dry-run.\n",
    );
    process.exitCode = 2;
    return;
  }

  const report = await runGuardian({
    dryRun: true,
    trigger: "cli",
    cwd: process.cwd(),
    skipHealth: hasFlag(argv, "--skip-health"),
    health: {
      url: flagValue(argv, "--health-url") ?? DEFAULT_HEALTH_URL,
    },
  });

  if (hasFlag(argv, "--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const lines = [
    `Guardian run ${report.run.id}`,
    `status=${report.run.status} dryRun=${String(report.run.dryRun)} risk=${report.run.riskLevel}`,
    `observations=${report.observations.length} incidents=${report.incidents.length} diagnoses=${report.diagnoses.length} remediations=${report.remediations.length}`,
    `validation=${report.validation?.evidence ?? "n/a"}`,
    `prCreated=${String(report.pullRequest?.created ?? false)} merged=${String(report.merged)} deployed=${String(report.deployed)} productionMutated=${String(report.productionMutated)}`,
    report.run.summary,
    "",
  ];
  process.stdout.write(lines.join("\n"));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "guardian_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
