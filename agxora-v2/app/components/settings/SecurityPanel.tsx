"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type JSX } from "react";
import { useAuth } from "../../lib/auth";
import { isServerAuthMode } from "../../lib/auth/mode";
import {
  sessionsClient,
  type ManagedSessionDto,
} from "../../lib/auth/sessionsClient";
import {
  ensureActiveSession,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  useIdentity,
  type SessionRecord,
} from "../../lib/identity";
import { localizeThrownError, useFormatters, useT } from "../../lib/i18n";
import { Badge, Button, EmptyState } from "../ui";
import {
  SettingsField,
  SettingsGrid,
  SettingsNotice,
  SettingsPanel,
} from "./forms/SettingsControls";

function UnavailableList({
  items,
}: {
  readonly items: readonly { readonly title: string; readonly body: string }[];
}): JSX.Element {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.title}
          className="rounded-xl border px-3 py-3"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {item.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SecurityUnavailableFeatures(): JSX.Element {
  const t = useT();
  return (
    <UnavailableList
      items={[
        { title: t("settings.security.mfaTitle"), body: t("settings.security.mfaUnavailable") },
        { title: t("settings.security.ssoTitle"), body: t("settings.security.ssoUnavailable") },
        {
          title: t("settings.security.encryptionTitle"),
          body: t("settings.security.encryptionUnavailable"),
        },
        {
          title: t("settings.security.trustedDevices"),
          body: t("settings.security.trustedUnavailable"),
        },
      ]}
    />
  );
}

function PasswordAndKeys(): JSX.Element {
  const t = useT();
  return (
    <SettingsGrid>
      <SettingsField label={t("settings.security.password")} hint={t("settings.security.passwordHint")}>
        <Link href="/forgot-password" className="inline-flex">
          <Button size="sm" variant="secondary">
            {t("settings.security.changePassword")}
          </Button>
        </Link>
      </SettingsField>
      <SettingsField label={t("settings.security.apiKeys")} hint={t("settings.security.apiKeysHint")}>
        <Link href="/dashboard/settings#api" className="inline-flex">
          <Button size="sm" variant="secondary">
            {t("settings.security.openApi")}
          </Button>
        </Link>
      </SettingsField>
    </SettingsGrid>
  );
}

function ServerSessionList(): JSX.Element {
  const t = useT();
  const formatters = useFormatters();
  const { hydrated, isAuthenticated, signOut } = useAuth();
  const [sessions, setSessions] = useState<readonly ManagedSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      setSessions([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const data = await sessionsClient.list();
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.security.loadFailed"));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [hydrated, isAuthenticated, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const onRevoke = async (session: ManagedSessionDto): Promise<void> => {
    if (session.current) return;
    setBusyId(session.id);
    setNotice(null);
    try {
      await sessionsClient.revoke(session.id);
      setNotice(t("settings.security.revoked"));
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.security.revokeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const onRevokeOthers = async (): Promise<void> => {
    setBusyId("others");
    setNotice(null);
    try {
      await sessionsClient.revokeOthers();
      setNotice(t("settings.security.othersRevoked"));
      await load();
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.security.revokeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const onLogoutCurrent = async (): Promise<void> => {
    setBusyId("current");
    try {
      await signOut();
      setSessions([]);
      setNotice(null);
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.security.revokeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  if (!hydrated || loading) {
    return (
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }} role="status">
        {t("settings.security.loading")}
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title={t("settings.security.signedOutTitle")}
        description={t("settings.security.signedOut")}
      />
    );
  }

  const hasOthers = sessions.some((session) => !session.current);

  return (
    <div className="space-y-3 min-w-0">
      {error ? <SettingsNotice>{error}</SettingsNotice> : null}
      {notice ? <SettingsNotice>{notice}</SettingsNotice> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("settings.security.activeSessions")}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="danger"
            disabled={!hasOthers || busyId !== null}
            loading={busyId === "others"}
            aria-label={t("settings.security.revokeOthersAria")}
            onClick={() => void onRevokeOthers()}
          >
            {t("settings.security.revokeOthers")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busyId !== null}
            loading={busyId === "current"}
            aria-label={t("settings.security.logoutAria")}
            onClick={() => void onLogoutCurrent()}
          >
            {t("settings.security.logout")}
          </Button>
        </div>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          title={t("settings.security.empty")}
          description={t("settings.security.emptyBody")}
        />
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const created = formatters.dateTime(session.createdAt);
            const expires = formatters.dateTime(session.expiresAt);
            return (
              <li
                key={session.id}
                className="rounded-xl border px-3 py-3 min-w-0"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {session.current
                        ? t("settings.security.currentSession")
                        : t("settings.security.otherSession")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed break-words" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {t("settings.security.createdAt")}: {created}
                      <span aria-hidden="true"> · </span>
                      {t("settings.security.expiresAt")}: {expires}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {t("settings.security.noDeviceMeta")}
                    </p>
                  </div>
                  {session.current ? (
                    <Badge tone="positive">{t("settings.security.currentBadge")}</Badge>
                  ) : (
                    <Badge tone="default">{t("settings.security.otherBadge")}</Badge>
                  )}
                </div>
                {!session.current ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId !== null}
                      loading={busyId === session.id}
                      aria-label={t("settings.security.revokeAria", { when: created })}
                      onClick={() => void onRevoke(session)}
                    >
                      {t("settings.security.revoke")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LocalDemoSessionList(): JSX.Element {
  const t = useT();
  const identity = useIdentity();
  const [notice, setNotice] = useState(t("settings.security.demoNotice"));
  const [sessions, setSessions] = useState<readonly SessionRecord[]>(() => {
    if (!identity.user || !identity.session) return [];
    ensureActiveSession(identity.user.id, identity.session.sessionId);
    return listSessions(identity.user.id);
  });

  return (
    <div className="space-y-3 min-w-0">
      <SettingsNotice>{t("settings.security.demoNotice")}</SettingsNotice>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("settings.security.activeSessions")}
        </h3>
        <Button
          size="sm"
          variant="danger"
          disabled={!identity.user || !identity.session}
          aria-label={t("settings.security.revokeOthersAria")}
          onClick={() => {
            if (!identity.user || !identity.session) return;
            setSessions(revokeOtherSessions(identity.user.id, identity.session.sessionId));
            setNotice(t("settings.security.othersRevoked"));
          }}
        >
          {t("settings.security.revokeOthers")}
        </Button>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          title={t("settings.security.empty")}
          description={t("settings.security.demoEmpty")}
        />
      ) : (
        <ul className="space-y-2">
          {sessions.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border px-3 py-3 min-w-0"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {item.current
                      ? t("settings.security.currentSession")
                      : t("settings.security.otherSession")}
                  </p>
                  <p className="mt-1 text-xs break-words" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {item.deviceLabel}
                  </p>
                </div>
                {item.current ? (
                  <Badge tone="positive">{t("settings.security.currentBadge")}</Badge>
                ) : (
                  <Badge tone="default">{t("settings.security.otherBadge")}</Badge>
                )}
              </div>
              {!item.current ? (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={t("settings.security.revoke")}
                    onClick={() => {
                      if (!identity.user) return;
                      setSessions(revokeSession(identity.user.id, item.id));
                      setNotice(t("settings.security.revoked"));
                    }}
                  >
                    {t("settings.security.revoke")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <SettingsNotice>{notice}</SettingsNotice>
    </div>
  );
}

export function SecurityPanel(): JSX.Element {
  const t = useT();
  const serverMode = isServerAuthMode();

  return (
    <SettingsPanel
      title={t("settings.security.title")}
      description={t("settings.security.panelDescription")}
    >
      {serverMode ? (
        <SettingsNotice>{t("settings.security.serverNotice")}</SettingsNotice>
      ) : null}
      {serverMode ? <ServerSessionList /> : <LocalDemoSessionList />}
      <PasswordAndKeys />
      <SecurityUnavailableFeatures />
    </SettingsPanel>
  );
}
