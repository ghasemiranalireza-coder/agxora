/**
 * Agent OS persistence mode — client-safe public flag.
 *
 * local  (default): LocalAgentsRepository → browser localStorage (demo/dev)
 * server: RestAgentsRepository → /api/v1/agents/os-state (org-scoped Postgres)
 *
 * Production first-customer path must set:
 *   NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE=server
 * alongside server auth + CRM database mode (Phase 57 gate).
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
