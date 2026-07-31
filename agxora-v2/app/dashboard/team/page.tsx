"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { Badge, Button, Card, DataTable, EmptyState, FilterSelect, Skeleton } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import {
  IDENTITY_ROLES,
  canAccessModule,
  changeRole,
  inviteMember,
} from "../../lib/identity";
import { useOrganization } from "../../lib/organization";
import type { MembershipRole, WorkspaceMembership } from "../../lib/organization/types";
import { teamService, type TeamInvitation } from "../../lib/saas";

const INVITE_ROLES: MembershipRole[] = ["admin", "manager", "employee", "guest", "viewer"];

type MemberRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: MembershipRole;
  readonly status: string;
  readonly membership: WorkspaceMembership;
};

export default function TeamPage(): JSX.Element {
  const { user } = useAuth();
  const { organization, workspace, session } = useOrganization();
  const [members, setMembers] = useState<readonly WorkspaceMembership[]>([]);
  const [invitations, setInvitations] = useState<readonly TeamInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("employee");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const actorRole =
    session.memberships.find((m) => m.userId === user?.id)?.role ?? null;
  const canManage = canAccessModule(actorRole, "team");

  const refresh = useCallback(async (): Promise<void> => {
    if (!organization) return;
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, [organization, user]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const rows = useMemo<readonly MemberRow[]>(() => {
    const directory = organization
      ? teamService.listDirectory(organization.id)
      : [];
    return members.map((membership) => {
      const profile = directory.find((d) => d.userId === membership.userId);
      return {
        id: membership.id,
        name: profile?.displayName ?? membership.userId,
        email: profile?.email ?? "—",
        role: membership.role,
        status: membership.status,
        membership,
      };
    });
  }, [members, organization]);

  const pending = invitations.filter((i) => i.status === "pending");
  const history = invitations.filter((i) => i.status !== "pending");

  const columns = useMemo<DataTableColumn<MemberRow>[]>(
    () => [
      { key: "name", header: "Member", render: (r) => r.name },
      { key: "email", header: "Email", render: (r) => r.email },
      {
        key: "role",
        header: "Role",
        render: (r) => (
          <select
            aria-label={`Role for ${r.name}`}
            value={r.role}
            disabled={!canManage || r.role === "owner" || busy}
            onChange={(e) => {
              if (!organization || !user) return;
              const next = e.target.value as MembershipRole;
              setBusy(true);
              void changeRole({
                organizationId: organization.id,
                membershipId: r.id,
                role: next,
                actorUserId: user.id,
              })
                .then(() => refresh())
                .then(() => setMessage(`Updated ${r.name} to ${next}`))
                .catch((err: unknown) =>
                  setMessage(err instanceof Error ? err.message : "Role change failed"),
                )
                .finally(() => setBusy(false));
            }}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              background: "rgba(255,255,255,0.04)",
              color: "var(--agx-text, #f8fafc)",
            }}
          >
            {(["owner", ...INVITE_ROLES] as MembershipRole[]).map((item) => (
              <option key={item} value={item} disabled={item === "owner" && r.role !== "owner"}>
                {item}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (r) => (
          <Badge tone={r.status === "active" ? "positive" : "warning"}>{r.status}</Badge>
        ),
      },
    ],
    [busy, canManage, organization, refresh, user],
  );

  const onInvite = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!organization || !workspace || !user) {
      setMessage("Sign in and activate an organization first.");
      return;
    }
    if (!canManage) {
      setMessage("Missing permission — Admin or Manager required to invite.");
      return;
    }
    setBusy(true);
    try {
      await inviteMember({
        organizationId: organization.id,
        workspaceId: workspace.id,
        email,
        role,
        invitedBy: user.id,
      });
      setEmail("");
      setMessage("Invitation created (pending).");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-2">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--agx-accent, #22d3ee)" }}
          >
            Identity & Access
          </p>
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            Team
          </h1>
          <p className="max-w-2xl text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Members, roles, and invitations for{" "}
            {organization?.name ?? "your organization"}. Architecture-ready for a future identity API.
          </p>
        </header>

        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Invite by Email
          </h2>
          <form
            onSubmit={(event) => void onInvite(event)}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <label className="min-w-[220px] flex-1 space-y-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Email
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                disabled={busy || !canManage}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              />
            </label>
            <FilterSelect
              label="Role"
              value={role}
              disabled={busy || !canManage}
              onChange={(event) => setRole(event.target.value as MembershipRole)}
            >
              {INVITE_ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </FilterSelect>
            <Button type="submit" variant="primary" disabled={busy || !canManage} loading={busy}>
              Invite
            </Button>
          </form>
          {message ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {message}
            </p>
          ) : null}
        </Card>

        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Roles
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IDENTITY_ROLES.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.name}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="20px" hover={false}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Members
          </h2>
          {loading ? (
            <div className="space-y-2">
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle="No members yet"
              emptyDescription="Invite colleagues to join this organization workspace."
              minWidth={640}
            />
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Pending Invitations
            </h2>
            {pending.length === 0 ? (
              <EmptyState
                title="No pending invitations"
                description="New invites appear here until accepted or expired."
              />
            ) : (
              <ul className="space-y-2">
                {pending.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div>
                      <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                        {invitation.email}
                      </p>
                      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                        {invitation.role} · expires {invitation.expiresAt.slice(0, 10)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="accent">pending</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!canManage}
                        onClick={() => {
                          teamService.revokeInvitation(invitation.id);
                          void refresh();
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Invitation History
            </h2>
            {history.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Accepted, expired, and revoked invitations will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                    }}
                  >
                    <span className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {invitation.email}
                    </span>
                    <Badge
                      tone={
                        invitation.status === "accepted"
                          ? "positive"
                          : invitation.status === "expired"
                            ? "warning"
                            : "default"
                      }
                    >
                      {invitation.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
