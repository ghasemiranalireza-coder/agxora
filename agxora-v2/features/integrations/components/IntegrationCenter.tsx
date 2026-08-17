"use client";

import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import { integrationsStore } from "../store";
import { integrationService } from "../services";
import { useIntegrationPlatform } from "../hooks";
import type {
  ApiKeyRecord,
  ConnectorId,
  IntegrationConnection,
  IntegrationLogEntry,
  SyncMode,
  WebhookDelivery,
  WebhookEndpoint,
} from "../types";

type TabId =
  | "dashboard"
  | "installed"
  | "available"
  | "logs"
  | "api_keys"
  | "webhooks"
  | "developer";

function connectionStatusLabel(
  status: IntegrationConnection["status"],
  t: ReturnType<typeof useT>,
): string {
  switch (status) {
    case "connected":
      return t("integrations.connectionStatus.connected");
    case "pending_auth":
      return t("integrations.connectionStatus.pendingAuth");
    case "error":
      return t("integrations.connectionStatus.error");
    case "disabled":
      return t("integrations.connectionStatus.disabled");
    case "installed":
      return t("integrations.connectionStatus.installed");
    default:
      return t("integrations.connectionStatus.available");
  }
}

/**
 * Integration Center — modular interoperability surface.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function IntegrationCenter(): JSX.Element {
  const t = useT();
  const platform = useIntegrationPlatform();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [notice, setNotice] = useState(t("integrations.noticeDefault"));
  const [busy, setBusy] = useState(false);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [explorerPath, setExplorerPath] = useState("/api/v1/health");
  const [explorerResult, setExplorerResult] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(
    "https://hooks.example.com/agxora",
  );
  const [devDraft, setDevDraft] = useState<{
    sandboxMode?: boolean;
    webhookSigningEnabled?: boolean;
  } | null>(null);

  useEffect(() => {
    integrationsStore.hydrate();
  }, []);

  useEffect(() => {
    if (!platform.hydrated) return;
    integrationService.ensureWorkspace(platform.organizationId);
  }, [platform.hydrated, platform.organizationId]);

  const sandboxMode =
    devDraft?.sandboxMode ?? platform.developerSettings.sandboxMode;
  const webhookSigningEnabled =
    devDraft?.webhookSigningEnabled ??
    platform.developerSettings.webhookSigningEnabled;

  const tabs: readonly { id: TabId; label: string }[] = [
    { id: "dashboard", label: t("integrations.tabs.dashboard") },
    { id: "installed", label: t("integrations.tabs.installed") },
    { id: "available", label: t("integrations.tabs.available") },
    { id: "logs", label: t("integrations.tabs.logs") },
    { id: "api_keys", label: t("integrations.tabs.apiKeys") },
    { id: "webhooks", label: t("integrations.tabs.webhooks") },
    { id: "developer", label: t("integrations.tabs.developer") },
  ];

  if (!platform.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("integrations.loading")}
      </div>
    );
  }

  const onConnect = async (connectorId: ConnectorId) => {
    setBusy(true);
    try {
      const conn = await integrationService.connect(
        platform.organizationId,
        connectorId,
      );
      setNotice(t("integrations.notice.demoConnection", { name: conn.displayName }));
      setTab("installed");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("integrations.notice.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onCreateKey = () => {
    const key = integrationService.createKey({
      organizationId: platform.organizationId,
      name: `Key ${platform.apiKeys.length + 1}`,
      scopes: ["integrations.read", "webhooks.manage", "api:write"],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setCreatedKeySecret(key.secretOnce ?? null);
    setNotice(t("integrations.notice.keyCreated", { prefix: key.prefix }));
  };

  const onCreateWebhook = () => {
    const endpoint = integrationService.createWebhook({
      organizationId: platform.organizationId,
      name: `Webhook ${platform.webhooks.length + 1}`,
      direction: "outgoing",
      url: webhookUrl,
      events: ["customer.created", "invoice.issued", "integration.*"],
    });
    setNotice(t("integrations.notice.webhookCreated", { name: endpoint.name }));
  };

  const onTestWebhook = async (endpoint: WebhookEndpoint) => {
    setBusy(true);
    try {
      const delivery = await integrationService.sendWebhook(
        endpoint.id,
        "integration.test",
        { ping: true, at: new Date().toISOString() },
      );
      setNotice(t("integrations.notice.webhookTest", { status: delivery.status }));
    } finally {
      setBusy(false);
    }
  };

  const onExplore = async () => {
    setBusy(true);
    try {
      const { result } = await integrationService.exploreApi({
        organizationId: platform.organizationId,
        method: "GET",
        path: explorerPath,
        apiKeyId: platform.apiKeys.find((k) => k.status === "active")?.id,
      });
      setExplorerResult(JSON.stringify(result.body, null, 2));
      if (result.statusCode === 0) {
        const msg =
          typeof result.body.message === "string"
            ? result.body.message
            : t("integrations.errors.failedToFetch");
        setNotice(t("integrations.notice.networkError", { message: msg }));
      } else if (result.statusCode >= 400) {
        const msg =
          typeof result.body.message === "string"
            ? result.body.message
            : t("integrations.errors.httpStatus", { status: result.statusCode });
        setNotice(t("integrations.notice.explorerError", { status: result.statusCode, message: msg }));
      } else {
        setNotice(t("integrations.notice.explorerSuccess", { status: result.statusCode }));
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("integrations.notice.explorerFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onSync = async (connectionId: string, mode: SyncMode) => {
    setBusy(true);
    try {
      const job = await integrationService.sync({
        organizationId: platform.organizationId,
        connectionId,
        mode,
      });
      setNotice(
        t("integrations.notice.syncResult", {
          status: job.status,
          records: job.recordsProcessed,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const connectionColumns: DataTableColumn<IntegrationConnection>[] = [
    { key: "name", header: t("integrations.columns.integration"), render: (r) => r.displayName },
    {
      key: "status",
      header: t("integrations.columns.status"),
      render: (r) => connectionStatusLabel(r.status, t),
    },
    {
      key: "health",
      header: t("integrations.columns.health"),
      render: (r) => (r.status === "connected" ? t("integrations.connectionStatus.localDemo") : r.health.status),
    },
    {
      key: "latency",
      header: t("integrations.columns.latency"),
      render: (r) =>
        r.health.latencyMs != null ? `${r.health.latencyMs}ms` : t("integrations.actions.emDash"),
    },
    {
      key: "actions",
      header: t("integrations.columns.actions"),
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void integrationService.diagnose(r.id).then((c) => {
              setNotice(c?.health.message ?? t("integrations.notice.diagnosed"));
            })}
          >
            {t("integrations.actions.diagnose")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || r.status !== "connected"}
            title={t("integrations.actions.demoSyncTitle")}
            onClick={() => void onSync(r.id, "manual")}
          >
            {t("integrations.actions.demoSync")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              integrationService.disconnect(r.id);
              setNotice(t("integrations.notice.removedConnection", { name: r.displayName }));
            }}
          >
            {t("integrations.actions.disconnect")}
          </Button>
        </div>
      ),
    },
  ];

  const logColumns: DataTableColumn<IntegrationLogEntry>[] = [
    {
      key: "at",
      header: t("integrations.columns.when"),
      render: (r) => r.at.slice(0, 19).replace("T", " "),
    },
    { key: "level", header: t("integrations.columns.level"), render: (r) => r.level },
    { key: "source", header: t("integrations.columns.source"), render: (r) => r.source },
    { key: "message", header: t("integrations.columns.message"), render: (r) => r.message },
  ];

  const keyColumns: DataTableColumn<ApiKeyRecord>[] = [
    { key: "name", header: t("integrations.columns.name"), render: (r) => r.name },
    {
      key: "prefix",
      header: t("integrations.columns.key"),
      render: (r) => <span className="font-mono text-xs">{r.prefix}</span>,
    },
    { key: "status", header: t("integrations.columns.status"), render: (r) => r.status },
    {
      key: "scopes",
      header: t("integrations.columns.scopes"),
      render: (r) => r.scopes.slice(0, 2).join(", "),
    },
    {
      key: "usage",
      header: t("integrations.columns.usage"),
      render: (r) => String(r.usageCount),
    },
    {
      key: "actions",
      header: t("integrations.columns.actions"),
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={r.status !== "active"}
            onClick={() => {
              const next = integrationService.rotateKey(r.id);
              if (next?.secretOnce) setCreatedKeySecret(next.secretOnce);
              setNotice(t("integrations.notice.keyRotated"));
            }}
          >
            {t("integrations.actions.rotate")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={r.status === "revoked"}
            onClick={() => {
              integrationService.revokeKey(r.id);
              setNotice(t("integrations.notice.keyRevoked"));
            }}
          >
            {t("integrations.actions.revoke")}
          </Button>
        </div>
      ),
    },
  ];

  const webhookColumns: DataTableColumn<WebhookEndpoint>[] = [
    { key: "name", header: t("integrations.columns.name"), render: (r) => r.name },
    { key: "direction", header: t("integrations.columns.direction"), render: (r) => r.direction },
    {
      key: "url",
      header: t("integrations.columns.url"),
      render: (r) => <span className="font-mono text-[11px]">{r.url}</span>,
    },
    {
      key: "enabled",
      header: t("integrations.columns.enabled"),
      render: (r) => (r.enabled ? t("integrations.actions.yes") : t("integrations.actions.no")),
    },
    {
      key: "actions",
      header: t("integrations.columns.actions"),
      render: (r) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void onTestWebhook(r)}
        >
          {t("integrations.actions.test")}
        </Button>
      ),
    },
  ];

  const deliveryColumns: DataTableColumn<WebhookDelivery>[] = [
    {
      key: "at",
      header: t("integrations.columns.when"),
      render: (r) => r.createdAt.slice(0, 19).replace("T", " "),
    },
    { key: "event", header: t("integrations.columns.event"), render: (r) => r.eventType },
    { key: "status", header: t("integrations.columns.status"), render: (r) => r.status },
    {
      key: "attempt",
      header: t("integrations.columns.attempt"),
      render: (r) => `${r.attempt}/${r.maxAttempts}`,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
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
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("integrations.subtitle")}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {tabs.map((tabItem) => (
            <Button
              key={tabItem.id}
              size="sm"
              variant={tab === tabItem.id ? "primary" : "secondary"}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
            </Button>
          ))}
          <Link href="/dashboard/settings#integrations">
            <Button size="sm" variant="ghost">
              {t("integrations.settings")}
            </Button>
          </Link>
        </div>
      </Card>

      {tab === "dashboard" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("integrations.dashboard.demoLinks")} value={String(platform.metrics.connectedCount)} />
            <Stat label={t("integrations.dashboard.catalog")} value={String(platform.metrics.availableCount)} />
            <Stat label={t("integrations.dashboard.api24h")} value={String(platform.metrics.apiRequests24h)} />
            <Stat
              label={t("integrations.dashboard.webhooks24h")}
              value={String(platform.metrics.webhookDeliveries24h)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("integrations.dashboard.webhookFailures")} value={String(platform.metrics.webhookFailures24h)} />
            <Stat label={t("integrations.dashboard.syncJobs")} value={String(platform.metrics.syncJobs24h)} />
            <Stat label={t("integrations.dashboard.conflicts")} value={String(platform.metrics.syncConflicts24h)} />
            <Stat label={t("integrations.dashboard.errors")} value={String(platform.metrics.errorCount)} />
          </div>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.dashboard.connectionStatus")}
            </h2>
            <DataTable
              columns={connectionColumns}
              rows={[...platform.connections]}
              rowKey={(r) => r.id}
              emptyTitle={t("integrations.dashboard.emptyTitle")}
              emptyDescription={t("integrations.dashboard.emptyDescription")}
              minWidth={720}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.dashboard.eventBridgeDemo")}
            </h2>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("integrations.dashboard.eventBridgeHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["slack", "hubspot", "github"] as const).map((id) => (
                <Button
                  key={id}
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    void integrationService
                      .emitConnectorEvent(platform.organizationId, id, "ping", {
                        demo: true,
                      })
                      .then((e) => setNotice(`Published ${e.type}`));
                  }}
                >
                  {t("integrations.dashboard.emit", { id })}
                </Button>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      {tab === "installed" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("integrations.installed.title")}
          </h2>
          <DataTable
            columns={connectionColumns}
            rows={[...platform.connections]}
            rowKey={(r) => r.id}
            emptyTitle={t("integrations.installed.emptyTitle")}
            emptyDescription={t("integrations.installed.emptyDescription")}
            minWidth={720}
          />
          {platform.syncJobs[0] ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("integrations.installed.latestSync", {
                status: platform.syncJobs[0].status,
                records: platform.syncJobs[0].recordsProcessed,
                mode: platform.syncJobs[0].mode,
              })}
            </p>
          ) : null}
        </Card>
      ) : null}

      {tab === "available" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {platform.catalog.map((c) => {
            const installed = platform.connections.find(
              (x) => x.connectorId === c.id,
            );
            return (
              <Card key={c.id} className="flex flex-col gap-2" padding="20px" hover={false}>
                <p
                  className="text-[11px] uppercase tracking-wide"
                  style={{ color: "var(--agx-accent, #22d3ee)" }}
                >
                  {c.category} · {c.authMethod}
                </p>
                <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {c.name}
                </h3>
                <p
                  className="flex-1 text-xs leading-relaxed"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {c.description}
                </p>
                <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("integrations.available.protocols", { protocols: c.protocols.join(", ") })}
                </p>
                <Button
                  size="sm"
                  disabled={busy || installed?.status === "connected"}
                  onClick={() => void onConnect(c.id)}
                >
                  {installed?.status === "connected"
                    ? t("integrations.available.demoConnection")
                    : installed
                      ? t("integrations.available.connectDemo")
                      : t("integrations.available.installDemo")}
                </Button>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "logs" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("integrations.logs.title")}
          </h2>
          <DataTable
            columns={logColumns}
            rows={[...platform.logs]}
            rowKey={(r) => r.id}
            emptyTitle={t("integrations.logs.emptyTitle")}
            emptyDescription={t("integrations.logs.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "api_keys" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.apiKeys.title")}
            </h2>
            <Button size="sm" onClick={onCreateKey}>
              {t("integrations.apiKeys.generateKey")}
            </Button>
          </div>
          {createdKeySecret ? (
            <p
              className="rounded-xl border px-3 py-2 font-mono text-xs"
              style={{
                color: "var(--agx-text, #f8fafc)",
                borderColor:
                  "color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
              }}
            >
              {t("integrations.apiKeys.copyOnce", { secret: createdKeySecret })}
            </p>
          ) : null}
          <DataTable
            columns={keyColumns}
            rows={[...platform.apiKeys]}
            rowKey={(r) => r.id}
            emptyTitle={t("integrations.apiKeys.emptyTitle")}
            emptyDescription={t("integrations.apiKeys.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "webhooks" ? (
        <>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.webhooks.endpointsTitle")}
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="agx-ui-control min-w-[240px] flex-1 rounded-xl border px-3 py-2 text-sm"
                placeholder={t("integrations.webhooks.urlPlaceholder")}
              />
              <Button size="sm" onClick={onCreateWebhook}>
                {t("integrations.webhooks.addOutgoing")}
              </Button>
            </div>
            <DataTable
              columns={webhookColumns}
              rows={[...platform.webhooks]}
              rowKey={(r) => r.id}
              emptyTitle={t("integrations.webhooks.emptyTitle")}
              emptyDescription={t("integrations.webhooks.emptyDescription")}
              minWidth={720}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.webhooks.deliveryLogs")}
            </h2>
            <DataTable
              columns={deliveryColumns}
              rows={[...platform.deliveries]}
              rowKey={(r) => r.id}
              emptyTitle={t("integrations.webhooks.deliveriesEmptyTitle")}
              emptyDescription={t("integrations.webhooks.deliveriesEmptyDescription")}
              minWidth={640}
            />
          </Card>
        </>
      ) : null}

      {tab === "developer" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.developer.title")}
            </h2>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--agx-ds-text)" }}>
              <input
                type="checkbox"
                className="agx-ui-checkbox"
                checked={sandboxMode}
                onChange={(e) =>
                  setDevDraft((prev) => ({
                    ...prev,
                    sandboxMode: e.target.checked,
                  }))
                }
              />
              {t("integrations.developer.sandboxMode")}
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--agx-ds-text)" }}>
              <input
                type="checkbox"
                className="agx-ui-checkbox"
                checked={webhookSigningEnabled}
                onChange={(e) =>
                  setDevDraft((prev) => ({
                    ...prev,
                    webhookSigningEnabled: e.target.checked,
                  }))
                }
              />
              {t("integrations.developer.webhookSigning")}
            </label>
            <Button
              size="sm"
              onClick={() => {
                integrationService.saveDeveloperSettings({
                  ...platform.developerSettings,
                  sandboxMode,
                  webhookSigningEnabled,
                });
                setDevDraft(null);
                setNotice(t("integrations.notice.developerSaved"));
              }}
            >
              {t("integrations.developer.saveSettings")}
            </Button>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("integrations.developer.apiDocs", { url: platform.developerSettings.apiDocsUrl })} {platform.developerSettings.apiDocsUrl}
              <br />
              {t("integrations.developer.sdk", { url: platform.developerSettings.sdkPlaceholderUrl })} {platform.developerSettings.sdkPlaceholderUrl}
            </p>
          </Card>

          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.developer.explorerTitle")}
            </h2>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("integrations.developer.gatewayRoutes", {
                routes: platform.gatewayRoutes.map((r) => r.protocol).join(", "),
              })}
            </p>
            <input
              value={explorerPath}
              onChange={(e) => setExplorerPath(e.target.value)}
              className="agx-ui-control w-full rounded-xl border px-3 py-2 font-mono text-sm"
            />
            <Button size="sm" disabled={busy} onClick={() => void onExplore()}>
              {t("integrations.developer.sendGet")}
            </Button>
            {explorerResult ? (
              <pre
                className="max-h-48 overflow-auto rounded-xl border p-3 text-[11px]"
                style={{
                  color: "var(--agx-text-muted, #94a3b8)",
                  borderColor:
                    "color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
                }}
              >
                {explorerResult}
              </pre>
            ) : null}
          </Card>

          <Card className="space-y-2 lg:col-span-2" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("integrations.developer.oauthProviders")}
            </h2>
            <ul className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {platform.oauthProviders.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg px-2 py-1"
                  style={{
                    background:
                      "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
                    color: "var(--agx-text, #f8fafc)",
                  }}
                >
                  {p.displayName}
                </li>
              ))}
            </ul>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("integrations.developer.placeholdersHint")}
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card className="space-y-1" padding="16px" hover={false}>
      <p
        className="text-[11px] uppercase tracking-wide"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </Card>
  );
}

