/**
 * CRM persistence mode — client-safe public flag.
 * Production must set NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database when API is live.
 */

export type CrmPersistenceMode = "local" | "database";

export function getCrmPersistenceMode(): CrmPersistenceMode {
  const raw = (
    process.env.NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE || "local"
  ).trim().toLowerCase();
  return raw === "database" ? "database" : "local";
}

export function isCrmDatabaseMode(): boolean {
  return getCrmPersistenceMode() === "database";
}
