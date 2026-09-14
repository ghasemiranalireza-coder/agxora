"use client";

import { useMemo, useState, type JSX } from "react";
import { Button, Card } from "@/app/components/ui";
import { catalogCopy, useT } from "@/app/lib/i18n";
import {
  CENTER_FILTERS,
  filterResolvedProviders,
  type CenterFilter,
} from "@/app/lib/integrations/resolver";
import type { WorkspacePermissionFlags } from "@/app/lib/integrations/permission-flags";
import { useCanonicalIntegrations } from "../hooks/useCanonicalIntegrations";
import { ProviderCard } from "./ProviderCard";
import { IntegrationDeveloperTools } from "./IntegrationDeveloperTools";

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
 * Unified Integration Center.
 * Provider cards come from the server-authoritative canonical registry.
 * localStorage is never used for connection state.
 */
export function IntegrationCenter(): JSX.Element {
  const t = useT();
  const {
    providers,
    policy,
    error,
    setError,
    busy,
    setBusy,
    loaded,
    reload,
  } = useCanonicalIntegrations();
  const [filter, setFilter] = useState<CenterFilter>("all");
  const [showTools, setShowTools] = useState(false);

  const visible = useMemo(
    () => filterResolvedProviders(providers, filter),
    [providers, filter],
  );

  async function connect(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      const result = await api<{ authorizationUrl?: string }>(
        `/api/v1/integrations/${provider}/connect`,
        {
          method: "POST",
          body: JSON.stringify({ redirectPath: "/dashboard/integrations" }),
        },
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
      setError(
        err instanceof Error ? err.message : t("businessAgent.disconnectFailed"),
      );
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
      setError(
        err instanceof Error ? err.message : t("businessAgent.permissionFailed"),
      );
    } finally {
      setBusy(null);
    }
  }

  async function setMode(mode: "SAFE" | "ASSISTED" | "AUTONOMOUS") {
    setBusy("mode");
    setError(null);
    try {
      const result = await api<{ policy: { mode: typeof mode } }>(
        "/api/v1/agent-policy",
        { method: "PUT", body: JSON.stringify({ mode }) },
      );
      await reload();
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.policyFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("integrations.loading")}
      </div>
    );
  }

  return (
    <div className="agx-integrations mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("integrations.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("integrations.title")}
        </h1>
        <p
          className="max-w-3xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {catalogCopy(
            t,
            "integrations.center.subtitle",
            "One catalog for every AGXORA provider. Gmail and YouTube are the only production OAuth integrations. Other providers are architecture only — not connected.",
          )}
        </p>
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
        {error ? (
          <p role="alert" className="agx-integrations__alert">
            {error}
          </p>
        ) : null}
        <nav
          className="agx-integrations__filters"
          aria-label={catalogCopy(
            t,
            "integrations.center.filterLabel",
            "Integration categories",
          )}
        >
          {CENTER_FILTERS.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={filter === id ? "primary" : "secondary"}
              onClick={() => setFilter(id)}
            >
              {catalogCopy(t, `integrations.center.filters.${id}`, id)}
            </Button>
          ))}
          <Button
            size="sm"
            variant={showTools ? "primary" : "ghost"}
            onClick={() => setShowTools((value) => !value)}
          >
            {t("integrations.tabs.developer")}
          </Button>
        </nav>
      </Card>

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

      {visible.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {catalogCopy(t, "integrations.center.emptyFilter", "No providers in this view.")}
        </p>
      ) : null}

      {showTools ? <IntegrationDeveloperTools /> : null}
    </div>
  );
}
