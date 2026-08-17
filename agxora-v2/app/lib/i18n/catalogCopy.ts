/**
 * Resolve catalog copy through the existing t() helper.
 * If a key is missing, keep the stored string instead of showing the raw key.
 */

export function catalogCopy(
  t: (key: string, values?: Readonly<Record<string, string | number>>) => string,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

export function slugLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
