/**
 * UserProfile — authenticated principal across organizations.
 * Distinct from Employee (employment) and Customer (external party).
 */

import type { OrganizationId, UserId } from "./types";
import { asUserId } from "./types";

export type { UserId };

export type UserProfileStatus = "active" | "invited" | "suspended" | "deleted";

export interface UserProfile {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly preferredLanguage: string;
  readonly timezone: string;
  readonly defaultOrganizationId?: OrganizationId;
  readonly status: UserProfileStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateUserProfileInput {
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly preferredLanguage?: string;
  readonly timezone?: string;
  readonly defaultOrganizationId?: OrganizationId;
}

export function createUserProfile(
  input: CreateUserProfileInput,
  id: UserId = asUserId(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `usr_${crypto.randomUUID()}`
      : `usr_${Date.now().toString(36)}`,
  ),
): UserProfile {
  const now = new Date().toISOString();
  return {
    id,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    avatarUrl: input.avatarUrl,
    preferredLanguage: input.preferredLanguage ?? "en",
    timezone: input.timezone ?? "UTC",
    defaultOrganizationId: input.defaultOrganizationId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}
