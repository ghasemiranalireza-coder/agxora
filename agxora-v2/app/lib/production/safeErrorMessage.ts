/**
 * Safe client-facing error messages — never leak stack / internal details.
 */

const INTERNAL_PATTERNS = [
  /at\s+\S+\s+\(/i,
  /node_modules/i,
  /TypeError:/i,
  /ReferenceError:/i,
  /Cannot read propert/i,
  /ECONNREFUSED/i,
  /ENOENT/i,
  /webpack/i,
  /digest/i,
];

export function sanitizeClientErrorMessage(
  message: string | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  const trimmed = (message ?? "").trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 180) return fallback;
  if (INTERNAL_PATTERNS.some((re) => re.test(trimmed))) return fallback;
  // Keep short, human-readable product messages.
  if (/^[A-Za-z0-9][\w\s.,'’\-!?()]{2,179}$/.test(trimmed)) return trimmed;
  return fallback;
}
