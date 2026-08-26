/**
 * Phase 57.0 — First-customer production gate.
 *
 * Coherent production path:
 *   auth=server + AUTH_REQUIRED
 *   CRM=database
 *   Agent OS=server
 *   email provider != none
 *   mocks=false
 *
 * Development/local/demo remains permissive.
 */

import { getAuthMode, type AgxoraAuthMode } from "@/app/lib/auth/mode";
import {
  getCrmPersistenceMode,
  type CrmPersistenceMode,
} from "@/app/lib/crm/persistence/mode";
import {
  getAgentOsPersistenceMode,
  type AgentOsPersistenceMode,
} from "@/app/lib/agents/persistence/mode";
import {
  getEmailProviderId,
  type EmailProviderIdName,
} from "@/app/lib/email/providerId";

export type AgxoraRuntimeEnvName =
  | "development"
  | "test"
  | "staging"
  | "production";

export type FirstCustomerGateIssueCode =
  | "auth_required"
  | "auth_mode"
  | "crm_persistence"
  | "agent_os_persistence"
  | "email_provider"
  | "mocks_enabled"
  | "mode_coherence";

export type FirstCustomerGateIssue = {
  readonly code: FirstCustomerGateIssueCode;
  readonly message: string;
};

export type FirstCustomerModeSnapshot = {
  readonly runtime: AgxoraRuntimeEnvName;
  readonly nodeEnv: string;
  readonly authRequired: boolean;
  readonly authMode: AgxoraAuthMode;
  readonly crmPersistence: CrmPersistenceMode;
  readonly agentOsPersistence: AgentOsPersistenceMode;
  readonly emailProvider: EmailProviderIdName;
  readonly useMocks: boolean;
};

export type FirstCustomerGateResult = {
  readonly enforced: boolean;
  readonly ready: boolean;
  readonly snapshot: FirstCustomerModeSnapshot;
  readonly issues: readonly FirstCustomerGateIssue[];
};

/** Fail-closed runtime error when production gate blocks local/demo persistence. */
export class FirstCustomerProductionGateError extends Error {
  readonly code = "production_gate_not_ready" as const;
  readonly issues: readonly FirstCustomerGateIssue[];

  constructor(
    issues: readonly FirstCustomerGateIssue[],
    message?: string,
  ) {
    super(
      message ??
        (issues.map((issue) => issue.message).join("; ") ||
          "First-customer production gate is not ready"),
    );
    this.name = "FirstCustomerProductionGateError";
    this.issues = issues;
  }
}

function resolveRuntimeEnvName(): AgxoraRuntimeEnvName {
  const raw = (
    process.env.NEXT_PUBLIC_AGXORA_ENV ??
    process.env.NODE_ENV ??
    "development"
  ).toLowerCase();
  if (
    raw === "production" ||
    raw === "staging" ||
    raw === "test" ||
    raw === "development"
  ) {
    return raw;
  }
  return "development";
}

export function isProductionRuntime(
  runtime: AgxoraRuntimeEnvName = resolveRuntimeEnvName(),
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): boolean {
  return runtime === "production" || nodeEnv === "production";
}

export function collectFirstCustomerModeSnapshot(
  overrides: Partial<FirstCustomerModeSnapshot> = {},
): FirstCustomerModeSnapshot {
  return {
    runtime: overrides.runtime ?? resolveRuntimeEnvName(),
    nodeEnv: overrides.nodeEnv ?? process.env.NODE_ENV ?? "development",
    authRequired:
      overrides.authRequired ?? process.env.AGXORA_AUTH_REQUIRED === "true",
    authMode: overrides.authMode ?? getAuthMode(),
    crmPersistence: overrides.crmPersistence ?? getCrmPersistenceMode(),
    agentOsPersistence:
      overrides.agentOsPersistence ?? getAgentOsPersistenceMode(),
    emailProvider: overrides.emailProvider ?? getEmailProviderId(),
    useMocks:
      overrides.useMocks ?? process.env.AGXORA_USE_MOCKS !== "false",
  };
}

/**
 * Evaluate production coherence. When not in production, returns enforced=false
 * and ready=true (demo/local remains allowed), unless `forceEnforce` is set.
 */
export function evaluateFirstCustomerProductionGate(
  snapshot: FirstCustomerModeSnapshot = collectFirstCustomerModeSnapshot(),
  options?: { readonly forceEnforce?: boolean },
): FirstCustomerGateResult {
  const enforced =
    options?.forceEnforce === true ||
    isProductionRuntime(snapshot.runtime, snapshot.nodeEnv);

  if (!enforced) {
    return {
      enforced: false,
      ready: true,
      snapshot,
      issues: [],
    };
  }

  const issues: FirstCustomerGateIssue[] = [];

  if (!snapshot.authRequired) {
    issues.push({
      code: "auth_required",
      message: "AGXORA_AUTH_REQUIRED must be true in production",
    });
  }
  if (snapshot.authMode !== "server") {
    issues.push({
      code: "auth_mode",
      message: "Auth mode must be server in production",
    });
  }
  if (snapshot.crmPersistence !== "database") {
    issues.push({
      code: "crm_persistence",
      message:
        "NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE must be database in production",
    });
  }
  if (snapshot.agentOsPersistence !== "server") {
    issues.push({
      code: "agent_os_persistence",
      message:
        "NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE must be server in production",
    });
  }
  if (snapshot.emailProvider === "none") {
    issues.push({
      code: "email_provider",
      message:
        "AGXORA_EMAIL_PROVIDER must not be none in production (transactional auth email required)",
    });
  }
  if (snapshot.useMocks) {
    issues.push({
      code: "mocks_enabled",
      message: "AGXORA_USE_MOCKS must be false in production",
    });
  }

  if (
    snapshot.agentOsPersistence === "server" &&
    snapshot.crmPersistence === "local"
  ) {
    issues.push({
      code: "mode_coherence",
      message:
        "Agent OS server persistence cannot be paired with CRM local persistence in production",
    });
  }
  if (
    snapshot.crmPersistence === "database" &&
    snapshot.agentOsPersistence === "local"
  ) {
    issues.push({
      code: "mode_coherence",
      message:
        "CRM database persistence cannot be paired with Agent OS local persistence in production",
    });
  }
  if (
    snapshot.agentOsPersistence === "server" &&
    snapshot.authMode === "local"
  ) {
    issues.push({
      code: "mode_coherence",
      message:
        "Agent OS server persistence cannot be paired with local auth in production",
    });
  }

  const seen = new Set<string>();
  const unique = issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    enforced: true,
    ready: unique.length === 0,
    snapshot,
    issues: unique,
  };
}

/**
 * Block Agent OS local persistence in production runtime (client-safe).
 * Uses public env flags only — server-only gate fields are enforced on APIs.
 */
export function assertProductionAgentOsLocalPersistenceBlocked(
  snapshot: FirstCustomerModeSnapshot = collectFirstCustomerModeSnapshot(),
): void {
  if (!isProductionRuntime(snapshot.runtime, snapshot.nodeEnv)) return;
  if (snapshot.agentOsPersistence !== "local") return;
  throw new FirstCustomerProductionGateError([
    {
      code: "agent_os_persistence",
      message:
        "Agent OS local persistence is not allowed in production; set NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE=server",
    },
  ]);
}

/**
 * Block CRM local persistence in production runtime (client-safe).
 */
export function assertProductionCrmLocalPersistenceBlocked(
  snapshot: FirstCustomerModeSnapshot = collectFirstCustomerModeSnapshot(),
): void {
  if (!isProductionRuntime(snapshot.runtime, snapshot.nodeEnv)) return;
  if (snapshot.crmPersistence !== "local") return;
  throw new FirstCustomerProductionGateError([
    {
      code: "crm_persistence",
      message:
        "CRM local persistence is not allowed in production; set NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database",
    },
  ]);
}
