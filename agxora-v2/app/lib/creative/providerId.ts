/**
 * Phase 59 — client-safe creative image provider id (no secrets).
 */

export type CreativeImageProviderIdName = "none" | "openai";

export function getCreativeImageProviderId(
  raw: string | undefined = process.env.AGXORA_CREATIVE_IMAGE_PROVIDER,
): CreativeImageProviderIdName {
  const value = (raw ?? "none").trim().toLowerCase();
  if (value === "openai") return "openai";
  return "none";
}
