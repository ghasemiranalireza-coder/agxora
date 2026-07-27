"use client";

import { useEffect, useState, type FormEvent, type JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";
import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import type { MembershipRole, WorkspaceMembership } from "../../lib/organization/types";
import { teamService, type TeamInvitation } from "../../lib/saas";
import { useTheme } from "../../lib/theme";

const ROLES: MembershipRole[] = [
  "admin",
  "manager",
  "employee",
  "viewer",
];

export default function TeamPage(): JSX.Element {
  const { tokens } = useTheme();
  const { user } = useAuth();
  const { organization, workspace } = useOrganization();
  const [members, setMembers] = useState<readonly WorkspaceMembership[]>([]);
  const [invitations, setInvitations] = useState<readonly TeamInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("employee");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    if (!organization) return;
    const list = await teamService.listMembers(organization.id);
    setMembers(list);
    setInvitations(teamService.listInvitations(organization.id));
    teamService.ensureSubscription(organization.id);
    if (user) {
      teamService.registerMemberDirectory({
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: organization.id,
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const organizationId = organization?.id;
    if (!organizationId) return;

    void (async () => {
      const list = await teamService.listMembers(organizationId);
      if (cancelled) return;
      setMembers(list);
      setInvitations(teamService.listInvitations(organizationId));
      teamService.ensureSubscription(organizationId);
      if (user) {
        teamService.registerMemberDirectory({
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          organizationId,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organization?.id, user]);

  const onInvite = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!organization || !workspace || !user) {
      setMessage("Sign in and activate an organization first.");
      return;
    }
    try {
      teamService.invite({
        organizationId: organization.id,
        workspaceId: workspace.id,
        email,
        role,
        invitedBy: user.id,
      });
      setEmail("");
      setMessage("Invitation created");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invite failed");
    }
  };

  return (
    <AppShell>
      <ModulePanel
        title="Team"
        description="Invite members, assign roles, and manage ownership for this organization."
      >
        <form
          onSubmit={(event) => void onInvite(event)}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}
        >
          <input
            type="email"
            required
            placeholder="colleague@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              flex: 1,
              minWidth: 180,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${tokens.inputBorder}`,
              background: tokens.inputBg,
              color: tokens.text,
            }}
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as MembershipRole)}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${tokens.inputBorder}`,
              background: tokens.inputBg,
              color: tokens.text,
            }}
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${tokens.panelBorder}`,
              background: tokens.chatReplyBg,
              color: tokens.accent,
              cursor: "pointer",
              fontWeight: 650,
            }}
          >
            Invite
          </button>
        </form>

        {message ? (
          <p style={{ color: tokens.textMuted, fontSize: 13 }}>{message}</p>
        ) : null}

        <h2
          style={{
            color: tokens.accent,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Members
        </h2>
        <ul style={{ paddingLeft: 18, color: tokens.text, fontSize: 13 }}>
          {members.length === 0 ? <li>No members loaded yet</li> : null}
          {members.map((member) => (
            <li key={member.id}>
              {member.userId} — {member.role} ({member.status})
            </li>
          ))}
        </ul>

        <h2
          style={{
            color: tokens.accent,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Invitations
        </h2>
        <ul style={{ paddingLeft: 18, color: tokens.text, fontSize: 13 }}>
          {invitations.length === 0 ? <li>No pending invitations</li> : null}
          {invitations.map((invitation) => (
            <li key={invitation.id}>
              {invitation.email} — {invitation.role} — {invitation.status}
              {invitation.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => {
                    teamService.revokeInvitation(invitation.id);
                    void refresh();
                  }}
                  style={{
                    marginLeft: 8,
                    border: "none",
                    background: "transparent",
                    color: tokens.textMuted,
                    cursor: "pointer",
                  }}
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </ModulePanel>
    </AppShell>
  );
}
