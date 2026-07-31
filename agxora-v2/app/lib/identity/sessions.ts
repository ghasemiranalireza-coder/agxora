/**
 * Session / trusted-device architecture — local placeholder store.
 * Future: server-side session table + httpOnly cookies.
 */

import type { UserId } from "../organization/types";
import type { SessionRecord } from "./types";

const SESSION_KEY = "agxora.identity.sessions.v1";

function readAll(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: readonly SessionRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(rows));
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return "Mac · Browser";
  if (/Windows/i.test(ua)) return "Windows · Browser";
  if (/Linux/i.test(ua)) return "Linux · Browser";
  if (/iPhone|iPad/i.test(ua)) return "iOS · Browser";
  if (/Android/i.test(ua)) return "Android · Browser";
  return "Browser session";
}

/** Ensure a current session row exists for the signed-in user. */
export function ensureActiveSession(userId: UserId, sessionId: string): readonly SessionRecord[] {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const existing = readAll().filter((s) => s.userId === userId);
  const others = existing.map((s) => ({ ...s, current: false }));
  const current: SessionRecord = {
    id: sessionId,
    userId,
    deviceLabel: deviceLabel(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "n/a",
    ipHint: "local · placeholder",
    trusted: true,
    current: true,
    createdAt: others.find((s) => s.id === sessionId)?.createdAt ?? now,
    lastActiveAt: now,
    expiresAt: expires,
  };
  const merged = [current, ...others.filter((s) => s.id !== sessionId)];
  const rest = readAll().filter((s) => s.userId !== userId);
  writeAll([...rest, ...merged]);
  return merged;
}

export function listSessions(userId: UserId): readonly SessionRecord[] {
  return readAll()
    .filter((s) => s.userId === userId)
    .sort((a, b) => (a.current === b.current ? 0 : a.current ? -1 : 1));
}

export function revokeSession(userId: UserId, sessionId: string): readonly SessionRecord[] {
  const next = readAll().filter((s) => !(s.userId === userId && s.id === sessionId));
  writeAll(next);
  return listSessions(userId);
}

export function revokeOtherSessions(userId: UserId, keepSessionId: string): readonly SessionRecord[] {
  const next = readAll().filter((s) => s.userId !== userId || s.id === keepSessionId);
  writeAll(next);
  return listSessions(userId);
}

export function toggleTrustedDevice(
  userId: UserId,
  sessionId: string,
  trusted: boolean,
): readonly SessionRecord[] {
  const next = readAll().map((s) =>
    s.userId === userId && s.id === sessionId ? { ...s, trusted } : s,
  );
  writeAll(next);
  return listSessions(userId);
}
