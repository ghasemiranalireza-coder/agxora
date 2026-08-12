/**
 * Auth mode selection — Phase 43.
 *
 * server = production-grade path (bcrypt + httpOnly sessions)
 * local  = offline/dev LocalAuthAdapter only (NOT production identity)
 */

export type AgxoraAuthMode = "server" | "local";

export function getAuthMode(): AgxoraAuthMode {
  const explicit = (
    process.env.NEXT_PUBLIC_AGXORA_AUTH_MODE || ""
  )
    .trim()
    .toLowerCase();
  if (explicit === "local") return "local";
  if (explicit === "server") return "server";

  // Default: server when CRM database mode is on, else local for offline demo.
  const crm =
    (process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE || "local")
      .trim()
      .toLowerCase();
  return crm === "database" ? "server" : "local";
}

export function isServerAuthMode(): boolean {
  return getAuthMode() === "server";
}
