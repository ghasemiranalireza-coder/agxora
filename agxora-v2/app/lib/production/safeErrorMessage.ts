/**
 * Safe client-facing error messages — never leak stack / internal details.
 * Network failures like "Failed to fetch" must remain visible (not sanitized away).
 */

const INTERNAL_PATTERNS = [
  /at\s+\S+\s+\(/i,
  /node_modules/i,
  /ReferenceError:/i,
  /Cannot read propert/i,
  /ECONNREFUSED/i,
  /ENOENT/i,
  /webpack/i,
  /digest/i,
];

/** Messages that must pass through even if they look like engine TypeErrors. */
const PRESERVE_PATTERNS = [
  /failed to fetch/i,
  /network.?error/i,
  /load failed/i,
  /network request failed/i,
];

export function sanitizeClientErrorMessage(
  message: string | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  const trimmed = (message ?? "").trim();
  if (!trimmed) return fallback;

  if (PRESERVE_PATTERNS.some((re) => re.test(trimmed))) {
    // Strip a leading "TypeError: " so the real cause stays readable.
    return trimmed.replace(/^TypeError:\s*/i, "").slice(0, 180);
  }

  if (trimmed.length > 180) return fallback;
  if (/TypeError:/i.test(trimmed)) return fallback;
  if (INTERNAL_PATTERNS.some((re) => re.test(trimmed))) return fallback;
  // Keep short, human-readable product messages.
  if (/^[A-Za-z0-9][\w\s.,'’\-!?()]{2,179}$/.test(trimmed)) return trimmed;
  return fallback;
}
