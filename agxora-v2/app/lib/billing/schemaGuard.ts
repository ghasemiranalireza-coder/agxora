/** True when the Phase 21 tables are not migrated yet. Other database errors stay fatal. */

export function isMissingBillingSchema(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code: unknown }).code);
  return code === "P2021" || code === "P2022";
}
