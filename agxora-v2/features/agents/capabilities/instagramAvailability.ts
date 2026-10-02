/**
 * Shared availability for MARKETING_PUBLISH_INSTAGRAM.
 * Reads only the non-secret feature flag. Credentials stay server-side.
 */

export type InstagramAvailability = "LIVE" | "BLOCKED";

export function instagramPublishAvailabilityFromEnv(
  env: Record<string, string | undefined> = process.env,
): InstagramAvailability {
  const raw = env.AGXORA_INSTAGRAM_PUBLISH_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" ? "LIVE" : "BLOCKED";
}
