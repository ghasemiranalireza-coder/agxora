/**
 * Phase 23 — the legacy creative generate route is not the customer
 * marketing-image path. It stays mounted so old clients receive an explicit
 * refusal, and it never reaches a media provider.
 */
export const LEGACY_CREATIVE_GENERATE_CLOSED = {
  ok: false as const,
  code: "legacy_creative_generate_closed",
  message:
    "Legacy creative generation is closed. Marketing images are created only through the governed marketing image path.",
};
