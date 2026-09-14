/**
 * Workspace-scoped connection permission flags.
 * Stored on IntegrationConnection — never on credentials.
 */

export type WorkspacePermissionFlags = {
  readonly canRead: boolean;
  readonly canCreateDraft: boolean;
  readonly canSchedule: boolean;
  readonly canPublish: boolean;
  readonly canSendEmail: boolean;
  readonly canDelete: boolean;
};

/** SAFE MODE defaults: read/draft on, side effects off. */
export const SAFE_PERMISSIONS: WorkspacePermissionFlags = {
  canRead: true,
  canCreateDraft: true,
  canSchedule: false,
  canPublish: false,
  canSendEmail: false,
  canDelete: false,
};
