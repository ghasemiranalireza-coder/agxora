"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type JSX,
} from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, DataTable, Dialog, EmptyState } from "../../ui";
import type { DataTableColumn } from "../../ui";
import { localizeThrownError, useFormatters, useT } from "../../../lib/i18n";
import {
  controlPlaneClient,
  type InvitationDto,
  type MemberDto,
  type OrganizationDto,
  type OwnershipTransferDto,
  type WorkspaceDto,
} from "../../../lib/control-plane/client";
import {
  SettingsField,
  SettingsGrid,
  SettingsInput,
  SettingsNotice,
  SettingsPanel,
  SettingsSelect,
} from "../forms/SettingsControls";

type Role = "OWNER" | "ADMIN" | "MEMBER";

function roleLabel(t: (key: string) => string, role: string): string {
  if (role === "OWNER") return t("settings.controlPlane.roleOwner");
  if (role === "ADMIN") return t("settings.controlPlane.roleAdmin");
  return t("settings.controlPlane.roleMember");
}

export function OrganizationControlPanel(): JSX.Element {
  const t = useT();
  const [org, setOrg] = useState<OrganizationDto | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await controlPlaneClient.organization();
      setOrg(data.organization);
      setName(data.organization.name);
      setSlug(data.organization.slug);
      setError(null);
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const canUpdate = org?.viewerRole === "OWNER" || org?.viewerRole === "ADMIN";
  const canEditSlug = org?.viewerRole === "OWNER";

  const onSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!canUpdate) return;
    setBusy(true);
    setNotice(null);
    try {
      const data = await controlPlaneClient.updateOrganization({
        name,
        ...(canEditSlug ? { slug } : {}),
      });
      setOrg(data.organization);
      setName(data.organization.name);
      setSlug(data.organization.slug);
      setNotice(t("settings.controlPlane.orgUpdated"));
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPanel
      title={t("settings.organization.title")}
      description={t("settings.organization.panelDescription")}
    >
      {error ? <SettingsNotice>{error}</SettingsNotice> : null}
      {org ? (
        <form onSubmit={(e) => void onSave(e)} className="agx-ui-stack">
          <SettingsGrid>
            <SettingsField label={t("settings.controlPlane.orgName")}>
              <SettingsInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy || !canUpdate}
                readOnly={!canUpdate}
                aria-required="true"
                aria-readonly={!canUpdate}
              />
            </SettingsField>
            <SettingsField label={t("settings.controlPlane.orgSlug")}>
              <SettingsInput
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={busy || !canEditSlug}
                readOnly={!canEditSlug}
                aria-readonly={!canEditSlug}
              />
            </SettingsField>
            <SettingsField label={t("settings.controlPlane.owner")}>
              <SettingsInput
                value={`${org.ownerName} (${org.ownerEmail})`}
                readOnly
                aria-readonly="true"
              />
            </SettingsField>
            <SettingsField label={t("settings.controlPlane.counts")}>
              <SettingsInput
                value={t("settings.controlPlane.countsValue", {
                  members: org.memberCount,
                  workspaces: org.workspaceCount,
                })}
                readOnly
                aria-readonly="true"
              />
            </SettingsField>
          </SettingsGrid>
          {canUpdate ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
                {busy ? t("settings.controlPlane.saving") : t("settings.saveChanges")}
              </Button>
              {notice ? (
                <p className="text-sm" role="status" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                  {notice}
                </p>
              ) : null}
            </div>
          ) : notice ? (
            <p className="text-sm" role="status" style={{ color: "var(--agx-accent, #22d3ee)" }}>
              {notice}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("settings.controlPlane.loading")}
        </p>
      )}
    </SettingsPanel>
  );
}

export function WorkspaceControlPanel(): JSX.Element {
  const t = useT();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [active, setActive] = useState<WorkspaceDto | null>(null);
  const [name, setName] = useState("");
  const [createName, setCreateName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createId = useId();

  const load = useCallback(async () => {
    try {
      const data = await controlPlaneClient.workspaces();
      setWorkspaces(data.workspaces);
      const current =
        data.workspaces.find((w) => w.id === data.activeWorkspaceId) ??
        data.workspaces[0] ??
        null;
      setActive(current);
      setName(current?.name ?? "");
      setError(null);
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const onRename = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!active) return;
    setBusy(true);
    try {
      await controlPlaneClient.updateWorkspace(active.id, name);
      setNotice(t("settings.controlPlane.workspaceUpdated"));
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onSwitch = async (workspaceId: string): Promise<void> => {
    setBusy(true);
    try {
      await controlPlaneClient.switchWorkspace(workspaceId);
      setNotice(t("settings.controlPlane.workspaceSwitched"));
      await load();
      router.refresh();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      await controlPlaneClient.createWorkspace(createName);
      setCreateName("");
      setNotice(t("settings.controlPlane.workspaceCreated"));
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onArchive = async (): Promise<void> => {
    if (!active) return;
    setBusy(true);
    try {
      await controlPlaneClient.archiveWorkspace(active.id);
      setNotice(t("settings.controlPlane.workspaceArchived"));
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPanel
      title={t("settings.workspace.title")}
      description={t("settings.workspace.panelDescription")}
    >
      {error ? <SettingsNotice>{error}</SettingsNotice> : null}
      {notice ? (
        <p className="text-sm" role="status" style={{ color: "var(--agx-accent, #22d3ee)" }}>
          {notice}
        </p>
      ) : null}

      <SettingsField label={t("settings.controlPlane.switchWorkspace")}>
        <SettingsSelect
          aria-label={t("settings.controlPlane.switchWorkspace")}
          value={active?.id ?? ""}
          disabled={busy || workspaces.length === 0}
          onChange={(e) => void onSwitch(e.target.value)}
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
              {ws.isActive ? ` (${t("settings.controlPlane.active")})` : ""}
            </option>
          ))}
        </SettingsSelect>
      </SettingsField>

      {active ? (
        <form onSubmit={(e) => void onRename(e)} className="agx-ui-stack">
          <SettingsField label={t("settings.controlPlane.workspaceName")}>
            <SettingsInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy || active.role === "MEMBER"}
              readOnly={active.role === "MEMBER"}
              aria-readonly={active.role === "MEMBER"}
            />
          </SettingsField>
          {active.role !== "MEMBER" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
                {t("settings.controlPlane.rename")}
              </Button>
              {active.role === "OWNER" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => void onArchive()}
                >
                  {t("settings.controlPlane.archive")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}

      {active?.role === "OWNER" ? (
        <form onSubmit={(e) => void onCreate(e)} className="agx-ui-stack">
          <SettingsField label={t("settings.controlPlane.createWorkspace")}>
            <SettingsInput
              id={createId}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("settings.controlPlane.workspaceName")}
              disabled={busy}
            />
          </SettingsField>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={busy || !createName.trim()}
            aria-busy={busy}
          >
            {t("settings.controlPlane.create")}
          </Button>
        </form>
      ) : null}
    </SettingsPanel>
  );
}

export function TeamControlPanel(): JSX.Element {
  const t = useT();
  const formatters = useFormatters();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("MEMBER");
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [invites, setInvites] = useState<InvitationDto[]>([]);
  const [pendingTransfer, setPendingTransfer] = useState<OwnershipTransferDto | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferConfirmName, setTransferConfirmName] = useState("");
  const [transferLink, setTransferLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const ws = await controlPlaneClient.workspaces();
      const current =
        ws.workspaces.find((item) => item.id === ws.activeWorkspaceId) ??
        ws.workspaces[0];
      if (!current) {
        setError(t("settings.controlPlane.loadFailed"));
        return;
      }
      setWorkspaceId(current.id);
      setRole(current.role);
      const [memberData, inviteData, transferData] = await Promise.all([
        controlPlaneClient.members(current.id),
        current.role === "MEMBER"
          ? Promise.resolve({ invitations: [] as InvitationDto[] })
          : controlPlaneClient.invitations(current.id),
        current.role === "OWNER"
          ? controlPlaneClient.pendingOwnershipTransfer()
          : Promise.resolve({ transfer: null as OwnershipTransferDto | null }),
      ]);
      setMembers(memberData.members);
      setInvites(
        inviteData.invitations.filter((inv) => !inv.acceptedAt && !inv.revokedAt),
      );
      setPendingTransfer(transferData.transfer);
      setError(null);
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const canManage = role === "OWNER" || role === "ADMIN";

  const columns: DataTableColumn<MemberDto>[] = [
    { key: "name", header: t("settings.controlPlane.member"), render: (r) => r.name },
    { key: "email", header: t("settings.controlPlane.email"), render: (r) => r.email },
    {
      key: "role",
      header: t("settings.controlPlane.role"),
      render: (r) =>
        canManage && r.role !== "OWNER" && (role === "OWNER" || r.role === "MEMBER") ? (
          <SettingsSelect
            aria-label={t("settings.controlPlane.changeRole")}
            value={r.role}
            disabled={busy}
            onChange={(e) => {
              if (!workspaceId) return;
              setBusy(true);
              void controlPlaneClient
                .changeRole(workspaceId, r.userId, e.target.value)
                .then(() => load())
                .catch((err: unknown) =>
                  setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed")),
                )
                .finally(() => setBusy(false));
            }}
          >
            {role === "OWNER" ? <option value="ADMIN">{roleLabel(t, "ADMIN")}</option> : null}
            <option value="MEMBER">{roleLabel(t, "MEMBER")}</option>
          </SettingsSelect>
        ) : (
          roleLabel(t, r.role)
        ),
    },
    {
      key: "status",
      header: t("settings.controlPlane.status"),
      render: (r) => <Badge tone="positive">{r.status}</Badge>,
    },
    {
      key: "joined",
      header: t("settings.controlPlane.joined"),
      render: (r) => formatters.date(r.joinedAt),
    },
    {
      key: "actions",
      header: t("settings.controlPlane.actions"),
      render: (r) =>
        canManage && r.role !== "OWNER" && (role === "OWNER" || r.role === "MEMBER") ? (
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (!workspaceId) return;
              setBusy(true);
              void controlPlaneClient
                .removeMember(workspaceId, r.userId)
                .then(() => load())
                .catch((err: unknown) =>
                  setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed")),
                )
                .finally(() => setBusy(false));
            }}
          >
            {t("settings.controlPlane.remove")}
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  const onInvite = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!workspaceId) return;
    setBusy(true);
    try {
      const result = await controlPlaneClient.invite(workspaceId, inviteEmail, inviteRole);
      if (result.acceptPath) {
        setInviteLink(`${window.location.origin}${result.acceptPath}`);
      } else {
        setInviteLink("");
      }
      setNotice(result.message);
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const eligibleTransferTargets = members.filter(
    (m) => m.role !== "OWNER" && m.userId !== pendingTransfer?.fromUserId,
  );

  const selectedTransferTarget = eligibleTransferTargets.find(
    (m) => m.userId === transferTargetId,
  );

  const onInitiateTransfer = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!transferTargetId || !selectedTransferTarget) return;
    if (transferConfirmName.trim() !== selectedTransferTarget.name.trim()) {
      setError(t("settings.controlPlane.transferConfirmMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result =
        await controlPlaneClient.initiateOwnershipTransfer(transferTargetId);
      if (result.confirmPath) {
        setTransferLink(`${window.location.origin}${result.confirmPath}`);
      } else {
        setTransferLink("");
      }
      setNotice(result.message);
      setTransferConfirmName("");
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPanel
      title={t("settings.team.title")}
      description={t("settings.team.panelDescription")}
      actions={
        canManage ? (
          <div className="flex flex-wrap gap-2">
            {role === "OWNER" && !pendingTransfer ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setTransferOpen(true);
                  setTransferLink(null);
                  setTransferTargetId(eligibleTransferTargets[0]?.userId ?? "");
                  setTransferConfirmName("");
                }}
              >
                {t("settings.controlPlane.transferOwnership")}
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              {t("settings.controlPlane.invite")}
            </Button>
          </div>
        ) : null
      }
    >
      {error ? <SettingsNotice>{error}</SettingsNotice> : null}
      {notice ? (
        <p className="text-sm" role="status" style={{ color: "var(--agx-accent, #22d3ee)" }}>
          {notice}
        </p>
      ) : null}

      {role === "OWNER" && pendingTransfer ? (
        <div
          className="space-y-2 rounded-xl border px-3 py-3"
          style={{ borderColor: "var(--agx-danger, #f87171)" }}
          role="status"
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("settings.controlPlane.transferPendingTitle")}
          </h3>
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("settings.controlPlane.transferPendingBody", {
              name: pendingTransfer.toUserName,
              email: pendingTransfer.toUserEmail,
              expires: formatters.date(pendingTransfer.expiresAt),
            })}
          </p>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("settings.controlPlane.transferPendingNote")}
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void controlPlaneClient
                .cancelOwnershipTransfer(pendingTransfer.id)
                .then(() => {
                  setNotice(t("settings.controlPlane.transferCancelled"));
                  return load();
                })
                .catch((err: unknown) =>
                  setError(
                    localizeThrownError(t, err, "settings.controlPlane.saveFailed"),
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            {t("settings.controlPlane.cancelTransfer")}
          </Button>
        </div>
      ) : null}

      {members.length === 0 ? (
        <EmptyState
          title={t("settings.controlPlane.noMembers")}
          description={t("settings.controlPlane.noMembersBody")}
        />
      ) : (
        <DataTable columns={columns} rows={members} rowKey={(r) => r.userId} minWidth={640} />
      )}

      {canManage ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("settings.controlPlane.pending")}
          </h3>
          {invites.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("settings.controlPlane.noPending")}
            </p>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
                  style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))" }}
                >
                  <span className="text-sm">
                    {inv.invitedEmail} · {roleLabel(t, inv.role)}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      if (!workspaceId) return;
                      setBusy(true);
                      void controlPlaneClient
                        .revokeInvitation(workspaceId, inv.id)
                        .then(() => load())
                        .catch((err: unknown) =>
                          setError(
                            localizeThrownError(t, err, "settings.controlPlane.saveFailed"),
                          ),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    {t("settings.controlPlane.revoke")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <Dialog
        open={inviteOpen}
        title={t("settings.controlPlane.inviteTitle")}
        onClose={() => {
          setInviteOpen(false);
          setInviteLink(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setInviteOpen(false)}
            >
              {t("settings.controlPlane.close")}
            </Button>
            <Button
              type="submit"
              form="invite-form"
              size="sm"
              disabled={busy || !inviteEmail.trim()}
            >
              {t("settings.controlPlane.sendInvite")}
            </Button>
          </div>
        }
      >
        <form id="invite-form" onSubmit={(e) => void onInvite(e)} className="space-y-4">
          <SettingsField label={t("settings.controlPlane.email")}>
            <SettingsInput
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              autoComplete="email"
              data-autofocus
            />
          </SettingsField>
          <SettingsField label={t("settings.controlPlane.role")}>
            <SettingsSelect
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
            >
              {role === "OWNER" ? <option value="ADMIN">{roleLabel(t, "ADMIN")}</option> : null}
              <option value="MEMBER">{roleLabel(t, "MEMBER")}</option>
            </SettingsSelect>
          </SettingsField>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("settings.controlPlane.inviteHonesty")}
          </p>
          {inviteLink ? (
            <p className="break-all text-xs" role="status">
              {t("settings.controlPlane.inviteLink")}: {inviteLink}
            </p>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={transferOpen}
        title={t("settings.controlPlane.transferTitle")}
        onClose={() => {
          setTransferOpen(false);
          setTransferLink(null);
          setTransferConfirmName("");
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTransferOpen(false)}
            >
              {t("settings.controlPlane.close")}
            </Button>
            <Button
              type="submit"
              form="ownership-transfer-form"
              size="sm"
              variant="danger"
              disabled={
                busy ||
                !transferTargetId ||
                !selectedTransferTarget ||
                transferConfirmName.trim() !== selectedTransferTarget.name.trim()
              }
            >
              {t("settings.controlPlane.transferInitiate")}
            </Button>
          </div>
        }
      >
        <form
          id="ownership-transfer-form"
          onSubmit={(e) => void onInitiateTransfer(e)}
          className="space-y-4"
        >
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("settings.controlPlane.transferWarning")}
          </p>
          <SettingsField label={t("settings.controlPlane.transferTarget")}>
            <SettingsSelect
              value={transferTargetId}
              onChange={(e) => {
                setTransferTargetId(e.target.value);
                setTransferConfirmName("");
              }}
              required
              data-autofocus
            >
              <option value="">{t("settings.controlPlane.transferSelectMember")}</option>
              {eligibleTransferTargets.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.email}) · {roleLabel(t, m.role)}
                </option>
              ))}
            </SettingsSelect>
          </SettingsField>
          {selectedTransferTarget ? (
            <SettingsField
              label={t("settings.controlPlane.transferTypeName", {
                name: selectedTransferTarget.name,
              })}
            >
              <SettingsInput
                value={transferConfirmName}
                onChange={(e) => setTransferConfirmName(e.target.value)}
                required
                autoComplete="off"
              />
            </SettingsField>
          ) : null}
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("settings.controlPlane.transferHonesty")}
          </p>
          {transferLink ? (
            <p className="break-all text-xs" role="status">
              {t("settings.controlPlane.transferLink")}: {transferLink}
            </p>
          ) : null}
        </form>
      </Dialog>
    </SettingsPanel>
  );
}
