"use client";

import { useState, type JSX } from "react";
import { Button } from "@/app/components/ui/Button";
import { useT } from "@/app/lib/i18n";
import type { WorkspacePermissionFlags } from "@/app/lib/integrations/permission-flags";
import { filterAgentSurfaceProviders } from "@/app/lib/integrations/resolver";
import { useCanonicalIntegrations } from "@/features/integrations/hooks/useCanonicalIntegrations";
import { ProviderCard } from "@/features/integrations/components/ProviderCard";

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

/**
 * Connected Accounts — same canonical provider definitions as Integration Center.
 * Kept for embedding in the agent surface without a second catalog.
 */
export function ConnectedAccounts(): JSX.Element {
  const t = useT();
  const {
    providers,
    policy,
    error,
    setError,
    busy,
    setBusy,
    reload,
  } = useCanonicalIntegrations();
  const visible = filterAgentSurfaceProviders(providers);
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
    key: keyof WorkspacePermissionFlags,
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

  async function setMode(mode: "SAFE" | "ASSISTED" | "AUTONOMOUS") {
    setBusy("mode");
    setError(null);
    try {
      await api("/api/v1/agent-policy", {
        method: "PUT",
        body: JSON.stringify({ mode }),
      });
      await reload();
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
        {visible.map((item) => (
          <ProviderCard
            key={item.providerId}
            item={item}
            busy={busy}
            onConnect={(routeId) => void connect(routeId)}
            onDisconnect={(routeId) => void disconnect(routeId)}
            onTogglePermission={(routeId, key, value) =>
              void togglePermission(routeId, key, value)
            }
          />
        ))}
      </div>
    </section>
  );
}
