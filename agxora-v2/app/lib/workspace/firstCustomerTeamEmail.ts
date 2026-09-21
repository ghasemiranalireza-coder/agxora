/**
 * First-customer Team + Email surface.
 *
 * Production team lives at Settings → Team (Prisma control plane).
 * Legacy /dashboard/team is localStorage and must not be presented as real.
 * Transactional email is server-only (app → email-worker → ESP).
 * Delivery status comes from the authenticated API after a write — never guessed.
 */

export const FIRST_CUSTOMER_TEAM_SETTINGS_HREF = "/dashboard/settings#team" as const;
export const LEGACY_TEAM_HREF = "/dashboard/team" as const;
export const LEGACY_EMAIL_HUB_HREF = "/dashboard/email" as const;

export type InviteDeliveryKind = "queued" | "manual" | "unknown";

export function inviteDeliveryKind(
  delivery: string | null | undefined,
): InviteDeliveryKind {
  if (delivery === "queued") return "queued";
  if (delivery === "not_configured") return "manual";
  return "unknown";
}

export function inviteHonestyMessageKey(
  delivery: string | null | undefined,
):
  | "settings.controlPlane.inviteQueued"
  | "settings.controlPlane.inviteHonesty"
  | "settings.controlPlane.inviteBeforeSend" {
  const kind = inviteDeliveryKind(delivery);
  if (kind === "queued") return "settings.controlPlane.inviteQueued";
  if (kind === "manual") return "settings.controlPlane.inviteHonesty";
  return "settings.controlPlane.inviteBeforeSend";
}

/** Shareable invite links are only shown when the server did not queue email. */
export function shouldShowManualInviteLink(
  delivery: string | null | undefined,
  acceptPath?: string | null,
): boolean {
  return inviteDeliveryKind(delivery) !== "queued" && Boolean(acceptPath);
}
