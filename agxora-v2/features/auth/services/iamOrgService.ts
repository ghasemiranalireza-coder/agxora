/**
 * Organization / workspace / team IAM façades — wrap existing services.
 */

import type {
  MembershipRole,
  Organization,
  OrganizationId,
  UserId,
  Workspace,
  WorkspaceId,
} from "@/app/lib/organization/types";
import { teamService } from "@/app/lib/saas/TeamService";
import type { IamMemberView, IamOrganizationView, IamWorkspaceView } from "../types";
import { normalizeIamRole } from "../guards";
import { iamAuditLog } from "../store/auditStore";

export function toIamOrganizationView(org: Organization): IamOrganizationView {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logoUrl,
    plan: org.subscriptionId || "starter",
    ownerId: org.ownerId,
    createdAt: org.createdAt,
  };
}

export function toIamWorkspaceView(workspace: Workspace): IamWorkspaceView {
  return {
    id: workspace.id,
    organizationId: workspace.organizationId,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
  };
}

export const iamTeamService = {
  async listMembers(organizationId: string): Promise<IamMemberView[]> {
    const members = await teamService.listMembers(
      organizationId as OrganizationId,
    );
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: normalizeIamRole(m.role) ?? m.role,
      status: m.status,
      organizationId: m.organizationId,
      workspaceId: m.workspaceId,
    }));
  },

  /** Invite placeholder — delivery is future backend. */
  invite(input: {
    organizationId: string;
    workspaceId: string;
    email: string;
    role: MembershipRole;
    invitedBy: string;
  }) {
    const invitation = teamService.invite({
      organizationId: input.organizationId as OrganizationId,
      workspaceId: input.workspaceId as WorkspaceId,
      email: input.email,
      role: input.role,
      invitedBy: input.invitedBy as UserId,
    });
    iamAuditLog({
      action: "team.invited",
      actorUserId: input.invitedBy,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      resource: "invitation",
      resourceId: invitation.id,
      metadata: { email: input.email, role: input.role },
    });
    return invitation;
  },

  async removeMember(input: {
    organizationId: string;
    membershipId: string;
    actorUserId: string;
  }) {
    await teamService.removeMember({
      organizationId: input.organizationId as OrganizationId,
      membershipId: input.membershipId,
      actorUserId: input.actorUserId as UserId,
    });
    iamAuditLog({
      action: "team.removed",
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      resource: "membership",
      resourceId: input.membershipId,
    });
  },

  /** Ownership transfer placeholder. */
  async transferOwnership(input: {
    organization: Organization;
    newOwnerUserId: string;
    actorUserId: string;
  }) {
    const result = await teamService.transferOwnership({
      organization: input.organization,
      toUserId: input.newOwnerUserId as UserId,
      actorUserId: input.actorUserId as UserId,
    });
    iamAuditLog({
      action: "team.ownership_transferred",
      actorUserId: input.actorUserId,
      organizationId: input.organization.id,
      resource: "organization",
      resourceId: input.organization.id,
      metadata: { newOwnerUserId: input.newOwnerUserId },
    });
    return result;
  },

  async changeRole(input: {
    organizationId: string;
    membershipId: string;
    role: MembershipRole;
    actorUserId: string;
  }) {
    const result = await teamService.assignRole({
      organizationId: input.organizationId as OrganizationId,
      membershipId: input.membershipId,
      role: input.role,
      actorUserId: input.actorUserId as UserId,
    });
    iamAuditLog({
      action: "rbac.role_changed",
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      resource: "membership",
      resourceId: input.membershipId,
      metadata: { role: input.role },
    });
    return result;
  },
};

export function logWorkspaceSwitch(input: {
  actorUserId?: string;
  organizationId?: string;
  workspaceId: string;
}): void {
  iamAuditLog({
    action: "workspace.switched",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    resource: "workspace",
    resourceId: input.workspaceId,
  });
}

export function logOrganizationCreated(input: {
  actorUserId?: string;
  organizationId: string;
}): void {
  iamAuditLog({
    action: "org.created",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    resource: "organization",
    resourceId: input.organizationId,
  });
}
