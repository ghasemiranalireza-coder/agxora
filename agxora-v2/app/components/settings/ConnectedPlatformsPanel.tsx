"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { Button } from "../ui";
import { catalogCopy, useT } from "../../lib/i18n";
import type { ResolvedProviderState } from "../../lib/integrations/resolver";
import { toPersistenceProviderId } from "../../lib/integrations/ids";
import { useCanonicalIntegrations } from "../../../features/integrations/hooks/useCanonicalIntegrations";
import { PlatformAuthorizationDialog } from "../../../features/integrations/components/PlatformAuthorizationDialog";

type AuthorizationView = {
  readonly provider: string;
  readonly accountLabel: string | null;
  readonly externalAccountId: string | null;
  readonly status: string;
  readonly permissionLabels: readonly string[];
  readonly automaticPublishingAuthorized: boolean;
  readonly authorizedAt: string | null;
  readonly lastSuccessfulSync: string | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    message?: string;
  };
  if (!response.ok || body.ok === false) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }
  return body;
}

function statusText(status: string, t: ReturnType<typeof useT>): string {
  switch (status) {
    case "connected":
      return catalogCopy(t, "integrations.authorization.status.connected", "Connected");
    case "disconnected":
      return catalogCopy(t, "integrations.authorization.status.disconnected", "Disconnected");
    case "expired":
      return catalogCopy(t, "integrations.authorization.status.expired", "Authorization expired");
    case "revoked":
      return catalogCopy(t, "integrations.authorization.status.revoked", "Authorization revoked");
    case "error":
      return catalogCopy(t, "integrations.authorization.status.error", "Connection error");
    case "pending":
      return catalogCopy(t, "integrations.authorization.status.pending", "Authorization pending");
    default:
      return catalogCopy(t, "integrations.authorization.status.notConnected", "Not connected");
  }
}

export function ConnectedPlatformsPanel({
  emptyTitleKey,
}: {
  readonly emptyTitleKey: string;
}): JSX.Element {
  const t = useT();
  const { providers, reload, error, setError } = useCanonicalIntegrations();
  const [authorizations, setAuthorizations] = useState<readonly AuthorizationView[]>([]);
  const [dialog, setDialog] = useState<ResolvedProviderState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoTarget, setAutoTarget] = useState<ResolvedProviderState | null>(null);
  const [autoConfirmed, setAutoConfirmed] = useState(false);

  const loadAuthorizations = useCallback(async () => {
    const result = await api<{ authorizations?: AuthorizationView[] }>(
      "/api/v1/integrations/authorizations",
    );
    setAuthorizations(result.authorizations ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api<{ authorizations?: AuthorizationView[] }>("/api/v1/integrations/authorizations")
      .then((result) => {
        if (!cancelled) setAuthorizations(result.authorizations ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load_failed");
      });
    return () => {
      cancelled = true;
    };
  }, [setError]);

  const available = providers.filter((item) => item.implementationStatus === "available");
  const connectedCount = available.filter((item) => item.connected).length;

  async function disconnect(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      await api(`/api/v1/integrations/${provider}/disconnect`, { method: "POST" });
      await Promise.all([reload(), loadAuthorizations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "disconnect_failed");
    } finally {
      setBusy(null);
    }
  }

  async function enableAutomaticPublishing(item: ResolvedProviderState) {
    const routeId = toPersistenceProviderId(item.providerId) ?? item.providerId;
    setBusy(`${routeId}:auto`);
    setError(null);
    try {
      await api(`/api/v1/integrations/${routeId}/automatic-publishing`, {
        method: "PUT",
        body: JSON.stringify({
          enabled: true,
          confirmed: true,
          contentTypes: ["freigegebene Beiträge"],
          accountLabel: item.accountLabel,
          frequency: catalogCopy(
            t,
            "integrations.authorization.frequencyManual",
            "According to the customer's saved publishing settings",
          ),
        }),
      });
      setAutoTarget(null);
      setAutoConfirmed(false);
      await Promise.all([reload(), loadAuthorizations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "auto_publish_failed");
    } finally {
      setBusy(null);
    }
  }

  async function disableAutomaticPublishing(provider: string) {
    setBusy(`${provider}:auto`);
    setError(null);
    try {
      await api(`/api/v1/integrations/${provider}/automatic-publishing`, {
        method: "PUT",
        body: JSON.stringify({ enabled: false, confirmed: true }),
      });
      await Promise.all([reload(), loadAuthorizations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "auto_publish_failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {connectedCount === 0 && authorizations.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t(emptyTitleKey)}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {available.map((item) => {
        const routeId = toPersistenceProviderId(item.providerId) ?? item.providerId;
        const grant = authorizations.find((entry) => entry.provider === routeId);
        const status = grant?.status ?? (item.connected ? "connected" : "not_connected");
        const autoOn = grant?.automaticPublishingAuthorized === true;
        return (
          <article
            key={item.providerId}
            className="rounded-2xl border p-4"
            style={{ borderColor: "var(--agx-ds-border, #334155)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{item.displayName}</h3>
                <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {grant?.accountLabel || item.accountLabel || item.externalAccountId || "—"}
                </p>
                <p className="mt-1 text-sm">{statusText(status, t)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDialog(item)}>
                  {item.connected
                    ? catalogCopy(t, "integrations.authorization.manage", "Manage")
                    : catalogCopy(t, "integrations.authorization.connect", "Connect")}
                </Button>
                {item.connected || (grant && grant.status !== "not_connected") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === routeId}
                    onClick={() => void disconnect(routeId)}
                  >
                    {catalogCopy(t, "integrations.authorization.disconnect", "Disconnect")}
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm">
              {catalogCopy(t, "integrations.authorization.permissions", "Permissions")}:{" "}
              {grant?.permissionLabels.length
                ? grant.permissionLabels.join(", ")
                : catalogCopy(t, "integrations.authorization.noneGranted", "None granted")}
            </p>
            <p className="text-sm">
              {catalogCopy(t, "integrations.authorization.connectedDate", "Connected")}:{" "}
              {grant?.authorizedAt ? new Date(grant.authorizedAt).toLocaleString() : "—"}
            </p>
            <p className="text-sm">
              {catalogCopy(t, "integrations.authorization.lastSync", "Last synchronization")}:{" "}
              {grant?.lastSuccessfulSync
                ? new Date(grant.lastSuccessfulSync).toLocaleString()
                : "—"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>
                {catalogCopy(
                  t,
                  "integrations.authorization.automaticPublishing",
                  "Automatic Publishing",
                )}
                : {autoOn ? "ACTIVE" : "OFF"}
              </span>
              {autoOn ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void disableAutomaticPublishing(routeId)}
                >
                  {catalogCopy(t, "integrations.authorization.turnOff", "Turn off")}
                </Button>
              ) : item.connected && item.implementedCapabilities.includes("publish") ? (
                <Button size="sm" variant="outline" onClick={() => setAutoTarget(item)}>
                  {catalogCopy(t, "integrations.authorization.turnOn", "Turn on")}
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
      {dialog ? (
        <PlatformAuthorizationDialog
          provider={toPersistenceProviderId(dialog.providerId) ?? dialog.providerId}
          displayName={dialog.displayName}
          accountLabel={dialog.accountLabel}
          redirectPath="/dashboard/settings#integrations"
          onClose={() => setDialog(null)}
          onConnected={(authorizationUrl) => {
            if (authorizationUrl) {
              window.location.assign(authorizationUrl);
              return;
            }
            setDialog(null);
            void Promise.all([reload(), loadAuthorizations()]);
          }}
        />
      ) : null}
      {autoTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2, 6, 23, 0.72)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-6"
            style={{
              background: "var(--agx-panel, #0f172a)",
              borderColor: "var(--agx-border, #334155)",
            }}
          >
            <h3 className="text-lg font-semibold">{autoTarget.displayName}</h3>
            <p className="mt-2 text-sm">
              {autoTarget.accountLabel || "—"}
            </p>
            <p className="mt-2 text-sm">
              {catalogCopy(
                t,
                "integrations.authorization.autoBody",
                "Automatic publishing stays off until you confirm the platform, account, content type, and that AI generation may be used.",
              )}
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoConfirmed}
                onChange={(event) => setAutoConfirmed(event.target.checked)}
              />
              <span>
                {catalogCopy(
                  t,
                  "integrations.authorization.autoConfirm",
                  "I confirm automatic publishing for this platform, account, and content type.",
                )}
              </span>
            </label>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setAutoTarget(null)}>
                {catalogCopy(t, "integrations.authorization.cancel", "Cancel")}
              </Button>
              <Button
                variant="premium"
                disabled={!autoConfirmed}
                onClick={() => void enableAutomaticPublishing(autoTarget)}
              >
                {catalogCopy(t, "integrations.authorization.turnOn", "Turn on")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
