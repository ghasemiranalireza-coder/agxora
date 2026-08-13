/**
 * Browser client for server-backed session management.
 * Authority remains the httpOnly session cookie.
 */

"use client";

export type ManagedSessionDto = {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  const payload = (await response.json()) as T & {
    ok?: boolean;
    message?: string;
  };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload;
}

export const sessionsClient = {
  list: () =>
    api<{ ok: true; sessions: readonly ManagedSessionDto[] }>(
      "/api/v1/auth/sessions",
    ),
  revoke: (id: string) =>
    api<{ ok: true; id: string }>(`/api/v1/auth/sessions/${id}/revoke`, {
      method: "POST",
      body: "{}",
    }),
  revokeOthers: () =>
    api<{ ok: true; revokedCount: number }>(
      "/api/v1/auth/sessions/revoke-others",
      { method: "POST", body: "{}" },
    ),
};
