/**
 * Hard stop conditions. Guardian never mutates production, DNS, or prod env.
 */

const PRODUCTION_ENV_FILES = /(^|\/)\.env(\.|$)/i;
const DNS_FILES = /(^|\/)dns(\.|\/)|route53|cloudflare.*dns|vercel\.json$/i;
const PRODUCTION_ROOTS = ["/var/www", "/usr/share/nginx", "production/"];

export class GuardianGuardError extends Error {
  readonly code:
    | "production_mutation"
    | "dns_mutation"
    | "production_env_mutation"
    | "main_mutation"
    | "merge_forbidden"
    | "deploy_forbidden"
    | "worktree_required";

  constructor(
    code: GuardianGuardError["code"],
    message: string,
  ) {
    super(message);
    this.name = "GuardianGuardError";
    this.code = code;
  }
}

export function assertNotProductionEnvMutation(files: readonly string[]): void {
  const hit = files.find((file) => PRODUCTION_ENV_FILES.test(file));
  if (hit) {
    throw new GuardianGuardError(
      "production_env_mutation",
      "Guardian must not modify production environment files",
    );
  }
}

export function assertNotDnsMutation(files: readonly string[]): void {
  const hit = files.find((file) => DNS_FILES.test(file));
  if (hit) {
    throw new GuardianGuardError(
      "dns_mutation",
      "Guardian must not modify DNS or hosting DNS configuration",
    );
  }
}

export function assertNotProductionMutation(input: {
  readonly files: readonly string[];
  readonly cwd?: string;
  readonly targetBranch?: string;
}): void {
  assertNotProductionEnvMutation(input.files);
  assertNotDnsMutation(input.files);
  if (input.targetBranch === "main" || input.targetBranch === "origin/main") {
    throw new GuardianGuardError(
      "main_mutation",
      "Guardian must not write directly to main",
    );
  }
  const cwd = input.cwd ?? "";
  if (PRODUCTION_ROOTS.some((root) => cwd.startsWith(root))) {
    throw new GuardianGuardError(
      "production_mutation",
      "Guardian must not modify a production filesystem root",
    );
  }
}

export function assertIsolatedWorktree(input: {
  readonly dryRun: boolean;
  readonly applyFixes: boolean;
  readonly worktreePath?: string;
  readonly currentBranch?: string;
}): void {
  if (input.dryRun || !input.applyFixes) return;
  if (input.currentBranch === "main" || input.currentBranch === "origin/main") {
    throw new GuardianGuardError(
      "main_mutation",
      "Guardian must not apply fixes on main",
    );
  }
  if (!input.worktreePath) {
    throw new GuardianGuardError(
      "worktree_required",
      "SAFE auto-fix requires an isolated worktree path",
    );
  }
}

export function assertCannotMerge(): never {
  throw new GuardianGuardError("merge_forbidden", "Guardian must not merge pull requests");
}

export function assertCannotDeploy(): never {
  throw new GuardianGuardError("deploy_forbidden", "Guardian must not deploy");
}

export const GUARDIAN_PRODUCTION_MUTATION = false;
export const GUARDIAN_AUTO_MERGE = false;
export const GUARDIAN_AUTO_DEPLOY = false;
