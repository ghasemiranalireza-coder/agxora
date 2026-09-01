"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import type { IntegrationPermissionFlags } from "@/app/lib/business-agent/catalog";
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

  const reload = useCallback(async () => {
    const [list, policyRes] = await Promise.all([
      api<{ integrations: IntegrationSummary[] }>("/api/v1/integrations"),
      api<{ policy: Policy }>("/api/v1/agent-policy"),
    ]);
    setItems(list.integrations);
    setPolicy(policyRes.policy);
  }, []);

  useEffect(() => {
    void reload().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    });
  }, [reload]);

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
    <section style={{ marginBottom: 32 }}>
      <h2 className="agx-ui-section-title">{t("businessAgent.connectedAccounts")}</h2>
      <p className="agx-ui-section-lead">{t("businessAgent.connectedAccountsLead")}</p>
      {policy ? (
        <p style={{ margin: "12px 0" }}>
          {t("businessAgent.autonomyMode")}: <strong>{policy.mode}</strong>
          {(["SAFE", "ASSISTED", "AUTONOMOUS"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={busy === "mode"}
              onClick={() => void setMode(mode)}
              style={{ marginLeft: 8 }}
            >
              {mode}
            </button>
          ))}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "var(--agx-danger, #b00020)" }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: "grid", gap: 16 }}>
        {items.map((item) => (
          <article
            key={item.provider}
            style={{
              border: "1px solid var(--agx-border, #333)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{item.label}</strong>
                <div>
                  {item.connected
                    ? t("businessAgent.connected")
                    : t("businessAgent.notConnected")}
                  {item.implementationStatus === "not_implemented"
                    ? ` · ${t("businessAgent.notImplemented")}`
                    : ""}
                </div>
                <small>{item.oauthNote}</small>
              </div>
              <div>
                {item.connected ? (
                  <button
                    type="button"
                    disabled={busy === item.provider}
                    onClick={() => void disconnect(item.provider)}
                  >
                    {t("businessAgent.disconnect")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === item.provider}
                    onClick={() => void connect(item.provider)}
                  >
                    {t("businessAgent.connect")}
                  </button>
                )}
              </div>
            </header>
            <fieldset style={{ marginTop: 12, border: 0, padding: 0 }}>
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
                <label key={key} style={{ display: "inline-flex", gap: 6, marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={item.permissions[key]}
                    disabled={busy === `${item.provider}:${key}`}
                    onChange={(event) =>
                      void togglePermission(item.provider, key, event.target.checked)
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </article>
        ))}
      </div>
    </section>
  );
}
