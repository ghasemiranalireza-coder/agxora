"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { AGStatus } from "@/app/components/ag/AGStatus";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import type { IntegrationPermissionFlags } from "@/app/lib/business-agent/catalog";
import {
  integrationVisualStatus,
  isIntegrationConnectable,
} from "@/app/lib/business-agent/integration-status";
import { useT } from "@/app/lib/i18n";

type IntegrationSummary = {
  readonly provider: string;
  readonly label: string;
  readonly category: "email" | "social";
  readonly implementationStatus: "oauth_ready" | "not_implemented";
  readonly oauthNote: string;
  readonly connected: boolean;
  readonly status: string;
  readonly accountLabel: string | null;
  readonly permissions: IntegrationPermissionFlags;
};

type Policy = { readonly mode: "SAFE" | "ASSISTED" | "AUTONOMOUS" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    message?: string;
    code?: string;
  };
  if (!response.ok || body.ok === false) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }
  return body;
}

export function ConnectedAccounts(): JSX.Element {
  const t = useT();
  const [items, setItems] = useState<readonly IntegrationSummary[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [gmailQuery] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("gmail");
  });
  const callbackNotice =
    gmailQuery === "denied"
      ? t("businessAgent.gmailDenied")
      : gmailQuery === "error"
        ? t("businessAgent.gmailError")
        : null;

  const reload = useCallback(async () => {
    const [list, policyRes] = await Promise.all([
      api<{ integrations: IntegrationSummary[] }>("/api/v1/integrations"),
      api<{ policy: Policy }>("/api/v1/agent-policy"),
    ]);
    setItems(list.integrations);
    setPolicy(policyRes.policy);
  }, []);

  useEffect(() => {
    void Promise.all([
      api<{ integrations: IntegrationSummary[] }>("/api/v1/integrations"),
      api<{ policy: Policy }>("/api/v1/agent-policy"),
    ])
      .then(([list, policyRes]) => {
        setItems(list.integrations);
        setPolicy(policyRes.policy);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
      });
  }, [t]);

  async function connect(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      const result = await api<{ authorizationUrl?: string }>(
        `/api/v1/integrations/${provider}/connect`,
        { method: "POST", body: JSON.stringify({ redirectPath: "/dashboard/integrations" }) },
      );
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.connectFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      await api(`/api/v1/integrations/${provider}/disconnect`, { method: "POST" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.disconnectFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function togglePermission(
    provider: string,
    key: keyof IntegrationPermissionFlags,
    value: boolean,
  ) {
    setBusy(`${provider}:${key}`);
    setError(null);
    try {
      await api(`/api/v1/integrations/${provider}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ [key]: value }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.permissionFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function setMode(mode: Policy["mode"]) {
    setBusy("mode");
    setError(null);
    try {
      const result = await api<{ policy: Policy }>("/api/v1/agent-policy", {
        method: "PUT",
        body: JSON.stringify({ mode }),
      });
      setPolicy(result.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.policyFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="agx-integrations" style={{ marginBottom: 32 }}>
      <h2 className="agx-ui-section-title">{t("businessAgent.connectedAccounts")}</h2>
      <p className="agx-ui-section-lead">{t("businessAgent.connectedAccountsLead")}</p>
      {policy ? (
        <div className="agx-integrations__policy">
          <span>
            {t("businessAgent.autonomyMode")}: <strong>{policy.mode}</strong>
          </span>
          <div className="agx-integrations__modes">
            {(["SAFE", "ASSISTED", "AUTONOMOUS"] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={policy.mode === mode ? "premium" : "secondary"}
                disabled={busy === "mode"}
                onClick={() => void setMode(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {error || callbackNotice ? (
        <p role="alert" className="agx-integrations__alert">
          {error || callbackNotice}
        </p>
      ) : null}
      <div className="agx-integrations__grid">
        {items.map((item) => {
          const visual = integrationVisualStatus({
            connected: item.connected,
            implementationStatus: item.implementationStatus,
            category: item.category,
            canPublish: item.permissions.canPublish,
            canSendEmail: item.permissions.canSendEmail,
          });
          const connectable = isIntegrationConnectable(item);
          return (
            <Card key={item.provider} hover={false} className="agx-integrations__card">
              <header className="agx-integrations__head">
                <div>
                  <strong>{item.label}</strong>
                  <div className="agx-integrations__badges">
                    {item.implementationStatus === "oauth_ready" && !item.connected ? (
                      <AGStatus status="available">{t("businessAgent.statusAvailable")}</AGStatus>
                    ) : null}
                    {item.connected ? (
                      <AGStatus status="connected">{t("businessAgent.connected")}</AGStatus>
                    ) : null}
                    {visual === "requires_authorization" ? (
                      <AGStatus status="requires_authorization">
                        {t("businessAgent.statusRequiresAuthorization")}
                      </AGStatus>
                    ) : null}
                    {visual === "requires_permission" ? (
                      <AGStatus status="requires_permission">
                        {t("businessAgent.statusRequiresPermission")}
                      </AGStatus>
                    ) : null}
                    {visual === "unsupported" ? (
                      <AGStatus status="unsupported">
                        {t("businessAgent.statusUnsupported")}
                      </AGStatus>
                    ) : null}
                  </div>
                  {item.accountLabel ? (
                    <div>
                      {t("businessAgent.accountEmail")}: {item.accountLabel}
                    </div>
                  ) : null}
                  <small>{item.oauthNote}</small>
                </div>
                <div>
                  {item.connected ? (
                    <Button
                      variant="outline"
                      disabled={busy === item.provider}
                      onClick={() => void disconnect(item.provider)}
                    >
                      {t("businessAgent.disconnect")}
                    </Button>
                  ) : connectable ? (
                    <Button
                      variant="premium"
                      disabled={busy === item.provider}
                      onClick={() => void connect(item.provider)}
                    >
                      {t("businessAgent.connect")}
                    </Button>
                  ) : (
                    <Button variant="ghost" disabled>
                      {t("businessAgent.connectUnavailable")}
                    </Button>
                  )}
                </div>
              </header>
              {item.implementationStatus === "oauth_ready" ? (
                <fieldset className="agx-integrations__perms">
                  <legend>{t("businessAgent.permissions")}</legend>
                  {(
                    [
                      ["canRead", t("businessAgent.permRead")],
                      ["canCreateDraft", t("businessAgent.permDraft")],
                      ["canSchedule", t("businessAgent.permSchedule")],
                      ["canPublish", t("businessAgent.permPublish")],
                      ["canSendEmail", t("businessAgent.permSend")],
                      ["canDelete", t("businessAgent.permDelete")],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="agx-integrations__perm">
                      <input
                        type="checkbox"
                        checked={item.permissions[key]}
                        disabled={!item.connected || busy === `${item.provider}:${key}`}
                        onChange={(event) =>
                          void togglePermission(item.provider, key, event.target.checked)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
