/**
 * Default auth adapter selection (Phase 43).
 * Server mode is the production path; local is offline demo only.
 */

import { localAuthAdapter } from "./LocalAuthAdapter";
import { serverAuthAdapter } from "./ServerAuthAdapter";
import { getAuthMode } from "./mode";
import type { AuthProviderPort } from "./types";

export function createDefaultAuthAdapter(): AuthProviderPort {
  return getAuthMode() === "server" ? serverAuthAdapter : localAuthAdapter;
}

export function getActiveAuthAdapter(): AuthProviderPort {
  return createDefaultAuthAdapter();
}
