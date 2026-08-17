/**
 * Test helpers for creating Session rows with hashed tokens (Phase 44.3).
 */

import { hashSessionToken } from "./tokens";

export function sessionRowForTests(input: {
  readonly userId: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
  readonly activeWorkspaceId?: string | null;
}) {
  return {
    userId: input.userId,
    tokenHash: hashSessionToken(input.rawToken),
    expiresAt: input.expiresAt,
    activeWorkspaceId: input.activeWorkspaceId ?? null,
  };
}
