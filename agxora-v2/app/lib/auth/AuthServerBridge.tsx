"use client";

/**
 * Phase 42.1 AuthServerBridge trusted client identity via /api/v1/auth/ensure.
 * Phase 43: retired. Server sessions are established only by login/register.
 *
 * Kept as a no-op wrapper so provider tree imports remain stable.
 */

import type { JSX, ReactNode } from "react";
import { clearServerSessionToken } from "../crm/directory/remoteAdapter";
import { useEffect } from "react";

export function AuthServerBridge({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  useEffect(() => {
    // Remove legacy sessionStorage token authority — cookie is the only credential.
    clearServerSessionToken();
  }, []);

  return <>{children}</>;
}
