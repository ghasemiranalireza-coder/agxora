"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { useOrganization } from "@/app/lib/organization";
import {
  IAM_ROLES,
  buildPermissionMatrix,
} from "../guards";
import { useIamAuth } from "../hooks/useIamAuth";
import { useIamAuditEvents, useIamSessionPolicy } from "../hooks/useIamStores";
import { iamSessionManager } from "../store/sessionManager";
import { iamAuditStore } from "../store/auditStore";
import { toIamOrganizationView } from "../services/iamOrgService";
import { formatAuditAction } from "../utils";
import { WorkspaceSelector } from "./WorkspaceSelector";

type IdentityTab =
  | "organization"
  | "workspace"
  | "roles"
  | "security"
  | "audit";

/**
 * Identity & Access settings — org, workspace, RBAC matrix, security placeholders, audit.
 */
export function IamIdentityWorkspace(): JSX.Element {
  const [tab, setTab] = useState<IdentityTab>("organization");
  const { organization, workspace } = useOrganization();
  const { role, can, isAuthenticated } = useIamAuth();
  const policy = useIamSessionPolicy();
  const audit = useIamAuditEvents();
  const orgView = organization ? toIamOrganizationView(organization) : null;

  useEffect(() => {
    iamAuditStore.hydrate();
    iamSessionManager.startAutoRefresh();
    return () => iamSessionManager.stopAutoRefresh();
  }, []);

  const matrix = useMemo(() => buildPermissionMatrix(), []);

  const matrixColumns: DataTableColumn<(typeof matrix)[number]>[] = [
    {
      key: "permissionId",
      header: "Permission",
      render: (row) => row.permissionId,
    },
    { key: "owner", header: "Owner", render: (row) => (row.owner ? "Yes" : "—") },
    { key: "admin", header: "Admin", render: (row) => (row.admin ? "Yes" : "—") },
    {
      key: "manager",
      header: "Manager",
      render: (row) => (row.manager ? "Yes" : "—"),
    },
    {
      key: "member",
      header: "Member",
      render: (row) => (row.member ? "Yes" : "—"),
    },
    {
      key: "viewer",
      header: "Viewer",
      render: (row) => (row.viewer ? "Yes" : "—"),
    },
  ];

  const auditColumns: DataTableColumn<(typeof audit)[number]>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => formatAuditAction(row.action),
    },
    {
      key: "actorUserId",
      header: "Actor",
      render: (row) => row.actorUserId ?? "—",
    },
    {
      key: "resource",
      header: "Resource",
      render: (row) =>
        row.resourceId ? `${row.resource}:${row.resourceId}` : row.resource,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Enterprise IAM
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Identity & Access
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Organization, workspace, RBAC, security placeholders, and audit
          architecture. Backend adapters plug in without changing this surface.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/dashboard/profile">
            <Button size="sm" variant="secondary">
              Open profile
            </Button>
          </Link>
          <Link href="/dashboard/team">
            <Button size="sm" variant="ghost">
              Team management
            </Button>
          </Link>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["organization", "Organization"],
            ["workspace", "Workspace"],
            ["roles", "Roles & permissions"],
            ["security", "Security"],
            ["audit", "Audit log"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{
              background:
                tab === id
                  ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 16%, transparent)"
                  : "transparent",
              color:
                tab === id
                  ? "var(--agx-accent, #22d3ee)"
                  : "var(--agx-text-muted, #94a3b8)",
              border:
                tab === id
                  ? "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 30%, transparent)"
                  : "1px solid color-mix(in srgb, var(--agx-border, #334155) 50%, transparent)",
            }}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "organization" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>Organization settings</SectionTitle>
          {orgView ? (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Meta label="Name" value={orgView.name} />
              <Meta label="Slug" value={orgView.slug} />
              <Meta label="Plan" value={orgView.plan} />
              <Meta label="Owner" value={orgView.ownerId} />
              <Meta
                label="Created"
                value={new Date(orgView.createdAt).toLocaleString()}
              />
              <Meta label="Your role" value={role ?? "—"} />
            </dl>
          ) : (
            <p
              className="text-sm"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              No organization active. Complete onboarding or create one from the
              organization service.
            </p>
          )}
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Logo upload and plan billing adapters are placeholders for the
            future identity backend.
          </p>
        </Card>
      ) : null}

      {tab === "workspace" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>Workspace settings</SectionTitle>
          <WorkspaceSelector />
          {workspace ? (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Meta label="Workspace" value={workspace.name} />
              <Meta label="Slug" value={workspace.slug} />
              <Meta label="Status" value={workspace.status} />
              <Meta label="Isolation key" value={workspace.isolationKey} />
            </dl>
          ) : null}
        </Card>
      ) : null}

      {tab === "roles" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>RBAC — default roles</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IAM_ROLES.map((item) => (
              <div
                key={item.key}
                className="rounded-xl p-3"
                style={{
                  border:
                    "1px solid color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {item.name}
                </p>
                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <SectionTitle>Permission matrix</SectionTitle>
          <DataTable
            columns={matrixColumns}
            rows={matrix}
            rowKey={(row) => row.permissionId}
            minWidth={720}
          />
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Can manage settings: {can("settings.manage") ? "yes" : "no"} ·
            Authenticated: {isAuthenticated ? "yes" : "no"}
          </p>
        </Card>
      ) : null}

      {tab === "security" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>Security settings</SectionTitle>
          <Placeholder
            title="Password change"
            detail="Password change connects through the auth provider when configured."
          />
          <Placeholder
            title="Two-factor authentication (2FA)"
            detail="TOTP and WebAuthn adapters register here when enabled."
          />
          <Placeholder
            title="Active sessions"
            detail="Device directory lives in identity sessions; revocation becomes authoritative with server sessions."
          />
          <Placeholder
            title="API keys"
            detail="Service accounts and scoped tokens for developers."
          />
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Meta
              label="Absolute timeout"
              value={`${Math.round(policy.absoluteTimeoutMs / 86400000)} days`}
            />
            <Meta
              label="Idle timeout"
              value={
                policy.idleTimeoutMs > 0
                  ? `${Math.round(policy.idleTimeoutMs / 60000)} min`
                  : "Disabled"
              }
            />
            <Meta
              label="Refresh skew"
              value={`${Math.round(policy.refreshSkewMs / 60000)} min`}
            />
            <Meta
              label="Persistent login"
              value={policy.persistentLogin ? "Enabled" : "Disabled"}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                iamSessionManager.updatePolicy({
                  idleTimeoutMs: policy.idleTimeoutMs > 0 ? 0 : 30 * 60 * 1000,
                })
              }
            >
              Toggle idle policy placeholder
            </Button>
            <Link href="/session-expired">
              <Button size="sm" variant="ghost">
                Preview session expired
              </Button>
            </Link>
            <Link href="/account-locked">
              <Button size="sm" variant="ghost">
                Preview account locked
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>Audit activity</SectionTitle>
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Login, logout, role changes, invites, and organization events are
            recorded locally. Replace with an immutable backend audit store later.
          </p>
          {audit.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              No IAM events yet. Sign in or change a role to populate the log.
            </p>
          ) : (
            <DataTable
              columns={auditColumns}
              rows={[...audit]}
              rowKey={(row) => row.id}
              minWidth={680}
            />
          )}
        </Card>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <h2
      className="text-sm font-semibold"
      style={{ color: "var(--agx-text, #f8fafc)" }}
    >
      {children}
    </h2>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div>
      <dt
        className="text-[11px] uppercase tracking-wider"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </dt>
      <dd
        className="mt-1 break-all"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {value}
      </dd>
    </div>
  );
}

function Placeholder({
  title,
  detail,
}: {
  title: string;
  detail: string;
}): JSX.Element {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        border:
          "1px solid color-mix(in srgb, var(--agx-border, #334155) 55%, transparent)",
        background:
          "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 40%, transparent)",
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {title}
      </p>
      <p
        className="mt-1 text-[11px] leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {detail}
      </p>
    </div>
  );
}
