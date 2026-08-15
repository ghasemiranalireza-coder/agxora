/**
 * CRM persistence mode — client-safe public flag.
 * Production must set NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database when API is live.
 *
 * database mode (Phase 42.1 + Phase 47 + Phase 48):
 *   Customers + Contacts + Notes → PostgreSQL via /api/v1/crm/*
 * local mode:
 *   Full CRM directory (customers, contacts, notes, …) → LocalStorage
 *
 * Still LocalStorage even in database mode: documents, activities.
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
