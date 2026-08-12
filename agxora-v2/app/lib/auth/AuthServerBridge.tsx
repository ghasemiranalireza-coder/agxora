"use client";

/**
 * Bridges LocalAuth → server Session (Phase 42.1).
 * Only active when CRM persistence mode is database.
 */

import { useEffect, type JSX, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { isCrmDatabaseMode } from "../crm/persistence/mode";
import {
  clearServerSessionToken,
  rememberServerSessionToken,
} from "../crm/directory/remoteAdapter";

export function AuthServerBridge({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const { user, session, hydrated, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isCrmDatabaseMode()) return;
    if (!hydrated) return;

    if (!isAuthenticated || !user || !session) {
      clearServerSessionToken();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/v1/auth/ensure", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: user.email,
            name: user.displayName,
            externalAuthId: user.id,
            accessToken: session.accessToken,
          }),
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          ok?: boolean;
          token?: string;
        };
        if (payload.ok && payload.token) {
          rememberServerSessionToken(payload.token);
        }
      } catch {
        // Server persistence unavailable — CRM will surface errors on write.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, user, session]);

  return <>{children}</>;
}
