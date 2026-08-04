/**
 * Lightweight onboarding flags — local only, no schema changes.
 */

const WELCOME_KEY = "agxora.onboarding.welcome.v1";

type WelcomeStore = {
  readonly pendingUserIds: readonly string[];
  readonly completedUserIds: readonly string[];
};

function readStore(): WelcomeStore {
  if (typeof window === "undefined") {
    return { pendingUserIds: [], completedUserIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(WELCOME_KEY);
    if (!raw) return { pendingUserIds: [], completedUserIds: [] };
    const parsed = JSON.parse(raw) as Partial<WelcomeStore>;
    return {
      pendingUserIds: Array.isArray(parsed.pendingUserIds)
        ? parsed.pendingUserIds.filter((id): id is string => typeof id === "string")
        : [],
      completedUserIds: Array.isArray(parsed.completedUserIds)
        ? parsed.completedUserIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return { pendingUserIds: [], completedUserIds: [] };
  }
}

function writeStore(store: WelcomeStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WELCOME_KEY, JSON.stringify(store));
}

export function markWelcomePending(userId: string): void {
  const store = readStore();
  if (store.pendingUserIds.includes(userId) || store.completedUserIds.includes(userId)) {
    return;
  }
  writeStore({
    ...store,
    pendingUserIds: [...store.pendingUserIds, userId],
  });
}

export function needsWelcome(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const store = readStore();
  return store.pendingUserIds.includes(userId);
}

export function completeWelcome(userId: string | null | undefined): void {
  if (!userId) return;
  const store = readStore();
  writeStore({
    pendingUserIds: store.pendingUserIds.filter((id) => id !== userId),
    completedUserIds: store.completedUserIds.includes(userId)
      ? store.completedUserIds
      : [...store.completedUserIds, userId],
  });
}
