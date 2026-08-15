/**
 * Browser client for the Organization & Workspace Control Plane.
 * Authority remains the httpOnly session cookie.
 */

"use client";

export type OrganizationDto = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly ownerEmail: string;
  readonly memberCount: number;
  readonly workspaceCount: number;
  readonly viewerRole: "OWNER" | "ADMIN" | "MEMBER";
};

export type WorkspaceDto = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly archivedAt: string | null;
  readonly isActive: boolean;
  readonly role: "OWNER" | "ADMIN" | "MEMBER";
  readonly memberCount: number;
};

export type MemberDto = {
  readonly userId: string;
  readonly membershipId: string;
  readonly email: string;
  readonly name: string;
  readonly role: "OWNER" | "ADMIN" | "MEMBER";
  readonly status: string;
  readonly joinedAt: string;
};

export type InvitationDto = {
  readonly id: string;
  readonly invitedEmail: string;
  readonly role: "OWNER" | "ADMIN" | "MEMBER";
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
};

export type OwnershipTransferDto = {
  readonly id: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly fromUserId: string;
  readonly fromUserName: string;
  readonly fromUserEmail: string;
  readonly toUserId: string;
  readonly toUserName: string;
  readonly toUserEmail: string;
  readonly expiresAt: string;
  readonly confirmedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly status: "pending" | "expired" | "cancelled" | "confirmed";
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

export const controlPlaneClient = {
  organization: () =>
    api<{ organization: OrganizationDto }>("/api/v1/organizations/current"),
  updateOrganization: (input: { name?: string; slug?: string }) =>
    api<{ organization: OrganizationDto }>("/api/v1/organizations/current", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  workspaces: () =>
    api<{ workspaces: WorkspaceDto[]; activeWorkspaceId: string }>(
      "/api/v1/workspaces",
    ),
  createWorkspace: (name: string) =>
    api<{ workspace: WorkspaceDto }>("/api/v1/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateWorkspace: (id: string, name: string) =>
    api<{ workspace: WorkspaceDto }>(`/api/v1/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  archiveWorkspace: (id: string) =>
    api<{ workspace: WorkspaceDto }>(`/api/v1/workspaces/${id}/archive`, {
      method: "POST",
    }),
  switchWorkspace: (id: string) =>
    api<{ workspaceId: string }>(`/api/v1/workspaces/${id}/switch`, {
      method: "POST",
    }),
  members: (workspaceId: string) =>
    api<{ members: MemberDto[] }>(`/api/v1/workspaces/${workspaceId}/members`),
  changeRole: (workspaceId: string, userId: string, role: string) =>
    api<{ member: MemberDto }>(
      `/api/v1/workspaces/${workspaceId}/members/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    ),
  removeMember: (workspaceId: string, userId: string) =>
    api<{ ok: boolean }>(
      `/api/v1/workspaces/${workspaceId}/members/${userId}`,
      { method: "DELETE" },
    ),
  invitations: (workspaceId: string) =>
    api<{ invitations: InvitationDto[] }>(
      `/api/v1/workspaces/${workspaceId}/invitations`,
    ),
  invite: (workspaceId: string, email: string, role: string) =>
    api<{
      invitation: InvitationDto;
      token?: string;
      acceptPath?: string;
      delivery: string;
      message: string;
    }>(`/api/v1/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  revokeInvitation: (workspaceId: string, invitationId: string) =>
    api<{ invitation: InvitationDto }>(
      `/api/v1/workspaces/${workspaceId}/invitations/${invitationId}/revoke`,
      { method: "POST" },
    ),
  previewInvite: (token: string) =>
    api<{
      invitation: {
        invitedEmail: string;
        role: string;
        workspaceName: string;
        organizationName: string;
        expiresAt: string;
        status: string;
      };
    }>(`/api/v1/invitations/${encodeURIComponent(token)}`),
  acceptInvite: (token: string) =>
    api<{ workspaceId: string }>(
      `/api/v1/invitations/${encodeURIComponent(token)}/accept`,
      { method: "POST" },
    ),
  pendingOwnershipTransfer: () =>
    api<{ transfer: OwnershipTransferDto | null }>(
      "/api/v1/organizations/current/ownership-transfer",
    ),
  initiateOwnershipTransfer: (targetUserId: string) =>
    api<{
      transfer: OwnershipTransferDto;
      token?: string;
      confirmPath?: string;
      delivery: string;
      message: string;
    }>("/api/v1/organizations/current/ownership-transfer", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    }),
  cancelOwnershipTransfer: (transferId?: string) =>
    api<{ transfer: OwnershipTransferDto }>(
      "/api/v1/organizations/current/ownership-transfer",
      {
        method: "DELETE",
        body: JSON.stringify(transferId ? { transferId } : {}),
      },
    ),
  previewOwnershipTransfer: (token: string) =>
    api<{
      transfer: {
        organizationName: string;
        workspaceName: string;
        fromUserName: string;
        fromUserEmail: string;
        toUserName: string;
        toUserEmail: string;
        expiresAt: string;
        status: string;
      };
    }>(`/api/v1/ownership-transfers/${encodeURIComponent(token)}`),
  confirmOwnershipTransfer: (token: string) =>
    api<{
      organizationId: string;
      workspaceId: string;
      previousOwnerId: string;
      newOwnerId: string;
      message: string;
    }>(`/api/v1/ownership-transfers/${encodeURIComponent(token)}/confirm`, {
      method: "POST",
    }),
};
