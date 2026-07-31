/**
 * User preference store — profile / language / timezone / notifications.
 */

import type { IamProfilePreferences } from "../types";

const STORAGE_KEY = "agxora-iam-profile-prefs-v1";

type Listener = () => void;

const listeners = new Set<Listener>();

const DEFAULT_PREFS: IamProfilePreferences = {
  displayName: "",
  email: "",
  language: "en-GB",
  timezone: "Europe/Berlin",
  notificationsEmail: true,
  notificationsPush: false,
};

let prefs: IamProfilePreferences = DEFAULT_PREFS;
let hydrated = false;

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export const iamProfileStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  hydrate(seed?: Partial<IamProfilePreferences>): void {
    if (typeof window === "undefined") {
      hydrated = true;
      return;
    }
    if (!hydrated) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<IamProfilePreferences>;
          prefs = { ...DEFAULT_PREFS, ...parsed };
        }
      } catch {
        prefs = DEFAULT_PREFS;
      }
      hydrated = true;
    }
    if (seed) {
      prefs = {
        ...prefs,
        displayName: seed.displayName || prefs.displayName,
        email: seed.email || prefs.email,
        avatarUrl: seed.avatarUrl ?? prefs.avatarUrl,
      };
    }
    emit();
  },

  get(): IamProfilePreferences {
    return prefs;
  },

  update(patch: Partial<IamProfilePreferences>): IamProfilePreferences {
    prefs = { ...prefs, ...patch };
    persist();
    emit();
    return prefs;
  },
};
