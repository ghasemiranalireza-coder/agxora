/**
 * Agent OS persistence mode — client-safe public flag.
 *
 * local  (default): LocalAgentsRepository → browser localStorage (demo/dev)
 * server: RestAgentsRepository → /api/v1/agents/os-state (org-scoped Postgres)
 *
 * Phase 57 production gate requires:
 *   NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE=server
 * with server auth, CRM database mode, AUTH_REQUIRED, and email != none.
 */

export type AgentOsPersistenceMode = "local" | "server";

export function getAgentOsPersistenceMode(): AgentOsPersistenceMode {
  const raw = (
    process.env.NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE || "local"
  )
    .trim()
    .toLowerCase();
  return raw === "server" ? "server" : "local";
}

export function isAgentOsServerMode(): boolean {
  return getAgentOsPersistenceMode() === "server";
}
