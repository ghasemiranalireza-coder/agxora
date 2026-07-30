const FAV_KEY = "agxora.workspace.favorites.v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

export function getFavoriteIds(): readonly string[] {
  return read();
}

export function isFavorite(id: string): boolean {
  return read().includes(id);
}

export function toggleFavorite(id: string): readonly string[] {
  const current = read();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
  write(next);
  return next;
}
