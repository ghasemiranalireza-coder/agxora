"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { useOrganization } from "@/app/lib/organization";
import { useT } from "@/app/lib/i18n";
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

const TAB_IDS = [
  "organization",
  "workspace",
  "roles",
  "security",
  "audit",
] as const satisfies readonly IdentityTab[];

/**
 * Identity & Access settings — org, workspace, RBAC matrix, security placeholders, audit.
 */
export function IamIdentityWorkspace(): JSX.Element {
  const t = useT();
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

  const matrixColumns: DataTableColumn<(typeof matrix)[number]>[] = useMemo(
    () => [
      {
        key: "permissionId",
        header: t("iam.identity.matrix.permission"),
        render: (row) => row.permissionId,
      },
      {
        key: "owner",
        header: t("iam.identity.matrix.owner"),
        render: (row) => (row.owner ? t("iam.identity.matrix.yes") : "—"),
      },
      {
        key: "admin",
        header: t("iam.identity.matrix.admin"),
        render: (row) => (row.admin ? t("iam.identity.matrix.yes") : "—"),
      },
      {
        key: "manager",
        header: t("iam.identity.matrix.manager"),
        render: (row) => (row.manager ? t("iam.identity.matrix.yes") : "—"),
      },
      {
        key: "member",
        header: t("iam.identity.matrix.member"),
        render: (row) => (row.member ? t("iam.identity.matrix.yes") : "—"),
      },
      {
        key: "viewer",
        header: t("iam.identity.matrix.viewer"),
        render: (row) => (row.viewer ? t("iam.identity.matrix.yes") : "—"),
      },
    ],
    [t],
  );

  const auditColumns: DataTableColumn<(typeof audit)[number]>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: t("iam.identity.audit.when"),
        render: (row) => new Date(row.createdAt).toLocaleString(),
      },
      {
        key: "action",
        header: t("iam.identity.audit.action"),
        render: (row) => formatAuditAction(row.action),
      },
      {
        key: "actorUserId",
        header: t("iam.identity.audit.actor"),
        render: (row) => row.actorUserId ?? "—",
      },
      {
        key: "resource",
        header: t("iam.identity.audit.resource"),
        render: (row) =>
          row.resourceId ? `${row.resource}:${row.resourceId}` : row.resource,
      },
    ],
    [t],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("iam.identity.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("iam.identity.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("iam.identity.lead")}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/dashboard/profile">
            <Button size="sm" variant="secondary">
              {t("iam.identity.openProfile")}
            </Button>
          </Link>
          <Link href="/dashboard/team">
            <Button size="sm" variant="ghost">
              {t("iam.identity.teamManagement")}
            </Button>
          </Link>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TAB_IDS.map((id) => (
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
            {t(`iam.identity.tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === "organization" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>{t("iam.identity.organizationSettings")}</SectionTitle>
          {orgView ? (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Meta label={t("iam.identity.meta.name")} value={orgView.name} />
              <Meta label={t("iam.identity.meta.slug")} value={orgView.slug} />
              <Meta label={t("iam.identity.meta.plan")} value={orgView.plan} />
              <Meta label={t("iam.identity.meta.owner")} value={orgView.ownerId} />
              <Meta
                label={t("iam.identity.meta.created")}
                value={new Date(orgView.createdAt).toLocaleString()}
              />
              <Meta label={t("iam.identity.meta.yourRole")} value={role ?? "—"} />
            </dl>
          ) : (
            <p
              className="text-sm"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {t("iam.identity.noOrganization")}
            </p>
          )}
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("iam.identity.logoPlaceholder")}
          </p>
        </Card>
      ) : null}

      {tab === "workspace" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>{t("iam.identity.workspaceSettings")}</SectionTitle>
          <WorkspaceSelector />
          {workspace ? (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Meta label={t("iam.identity.meta.workspace")} value={workspace.name} />
              <Meta label={t("iam.identity.meta.slug")} value={workspace.slug} />
              <Meta label={t("iam.identity.meta.status")} value={workspace.status} />
              <Meta label={t("iam.identity.meta.isolationKey")} value={workspace.isolationKey} />
            </dl>
          ) : null}
        </Card>
      ) : null}

      {tab === "roles" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>{t("iam.identity.rbacTitle")}</SectionTitle>
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
                  {t(`iam.roles.${item.key}.name`)}
                </p>
                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {t(`iam.roles.${item.key}.description`)}
                </p>
              </div>
            ))}
          </div>
          <SectionTitle>{t("iam.identity.permissionMatrix")}</SectionTitle>
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
            {t("iam.identity.canManageSettings", {
              value: can("settings.manage")
                ? t("iam.identity.yes")
                : t("iam.identity.no"),
              authenticated: isAuthenticated
                ? t("iam.identity.yes")
                : t("iam.identity.no"),
            })}
          </p>
        </Card>
      ) : null}

      {tab === "security" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>{t("iam.identity.securitySettings")}</SectionTitle>
          <Placeholder
            title={t("iam.identity.passwordChange.title")}
            detail={t("iam.identity.passwordChange.detail")}
          />
          <Placeholder
            title={t("iam.identity.twoFactor.title")}
            detail={t("iam.identity.twoFactor.detail")}
          />
          <Placeholder
            title={t("iam.identity.activeSessions.title")}
            detail={t("iam.identity.activeSessions.detail")}
          />
          <Placeholder
            title={t("iam.identity.apiKeys.title")}
            detail={t("iam.identity.apiKeys.detail")}
          />
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Meta
              label={t("iam.identity.absoluteTimeout")}
              value={t("iam.identity.days", {
                count: Math.round(policy.absoluteTimeoutMs / 86400000),
              })}
            />
            <Meta
              label={t("iam.identity.idleTimeout")}
              value={
                policy.idleTimeoutMs > 0
                  ? t("iam.identity.minutes", {
                      count: Math.round(policy.idleTimeoutMs / 60000),
                    })
                  : t("iam.identity.disabled")
              }
            />
            <Meta
              label={t("iam.identity.refreshSkew")}
              value={t("iam.identity.minutes", {
                count: Math.round(policy.refreshSkewMs / 60000),
              })}
            />
            <Meta
              label={t("iam.identity.persistentLogin")}
              value={
                policy.persistentLogin
                  ? t("iam.identity.enabled")
                  : t("iam.identity.disabled")
              }
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
              {t("iam.identity.toggleIdlePolicy")}
            </Button>
            <Link href="/session-expired">
              <Button size="sm" variant="ghost">
                {t("iam.identity.previewSessionExpired")}
              </Button>
            </Link>
            <Link href="/account-locked">
              <Button size="sm" variant="ghost">
                {t("iam.identity.previewAccountLocked")}
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card className="space-y-4" padding="24px" hover={false}>
          <SectionTitle>{t("iam.identity.auditActivity")}</SectionTitle>
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("iam.identity.auditLead")}
          </p>
          {audit.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {t("iam.identity.auditEmpty")}
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
