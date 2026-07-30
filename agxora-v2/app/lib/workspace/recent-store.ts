const RECENT_KEY = "agxora.workspace.recent-searches.v1";
const MAX_RECENT = 8;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(items: readonly string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

export function getRecentSearches(): readonly string[] {
  return read();
}

export function pushRecentSearch(query: string): readonly string[] {
  const q = query.trim();
  if (!q) return read();
  const next = [q, ...read().filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  write(next);
  return next;
}

export function clearRecentSearches(): void {
  write([]);
}
