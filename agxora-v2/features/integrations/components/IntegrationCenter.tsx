"use client";

import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
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

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "installed", label: "Installed" },
  { id: "available", label: "Available" },
  { id: "logs", label: "Logs" },
  { id: "api_keys", label: "API Keys" },
  { id: "webhooks", label: "Webhooks" },
  { id: "developer", label: "Developer" },
];

/**
 * Integration Center — modular interoperability surface.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function IntegrationCenter(): JSX.Element {
  const platform = useIntegrationPlatform();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [notice, setNotice] = useState(
    "Local demo connectors — OAuth and live sync are not connected.",
  );
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

  if (!platform.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading integration platform…
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
      setNotice(`Demo connection: ${conn.displayName} (local stub only)`);
      setTab("installed");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Connect failed");
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
    setNotice(`API key created: ${key.prefix}`);
  };

  const onCreateWebhook = () => {
    const endpoint = integrationService.createWebhook({
      organizationId: platform.organizationId,
      name: `Webhook ${platform.webhooks.length + 1}`,
      direction: "outgoing",
      url: webhookUrl,
      events: ["customer.created", "invoice.issued", "integration.*"],
    });
    setNotice(`Webhook created: ${endpoint.name}`);
  };

  const onTestWebhook = async (endpoint: WebhookEndpoint) => {
    setBusy(true);
    try {
      const delivery = await integrationService.sendWebhook(
        endpoint.id,
        "integration.test",
        { ping: true, at: new Date().toISOString() },
      );
      setNotice(`Webhook test ${delivery.status}`);
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
            : "Failed to fetch";
        setNotice(`API explorer network error: ${msg}`);
      } else if (result.statusCode >= 400) {
        const msg =
          typeof result.body.message === "string"
            ? result.body.message
            : `HTTP ${result.statusCode}`;
        setNotice(`API explorer → ${result.statusCode}: ${msg}`);
      } else {
        setNotice(`API explorer → ${result.statusCode}`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Explorer failed");
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
        `Demo sync · ${job.status} (${job.recordsProcessed} local records) — no external data transferred.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const connectionColumns: DataTableColumn<IntegrationConnection>[] = [
    { key: "name", header: "Integration", render: (r) => r.displayName },
    {
      key: "status",
      header: "Status",
      render: (r) => connectionStatusLabel(r.status),
    },
    {
      key: "health",
      header: "Health",
      render: (r) => (r.status === "connected" ? "Local demo" : r.health.status),
    },
    {
      key: "latency",
      header: "Latency",
      render: (r) =>
        r.health.latencyMs != null ? `${r.health.latencyMs}ms` : "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void integrationService.diagnose(r.id).then((c) => {
              setNotice(c?.health.message ?? "Diagnosed");
            })}
          >
            Diagnose
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || r.status !== "connected"}
            title="Demo sync only — no external transfer"
            onClick={() => void onSync(r.id, "manual")}
          >
            Demo sync
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              integrationService.disconnect(r.id);
              setNotice(`Removed demo connection: ${r.displayName}`);
            }}
          >
            Disconnect
          </Button>
        </div>
      ),
    },
  ];

  const logColumns: DataTableColumn<IntegrationLogEntry>[] = [
    {
      key: "at",
      header: "When",
      render: (r) => r.at.slice(0, 19).replace("T", " "),
    },
    { key: "level", header: "Level", render: (r) => r.level },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "message", header: "Message", render: (r) => r.message },
  ];

  const keyColumns: DataTableColumn<ApiKeyRecord>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    {
      key: "prefix",
      header: "Key",
      render: (r) => <span className="font-mono text-xs">{r.prefix}</span>,
    },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "scopes",
      header: "Scopes",
      render: (r) => r.scopes.slice(0, 2).join(", "),
    },
    {
      key: "usage",
      header: "Usage",
      render: (r) => String(r.usageCount),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={r.status !== "active"}
            onClick={() => {
              const next = integrationService.rotateKey(r.id);
              if (next?.secretOnce) setCreatedKeySecret(next.secretOnce);
              setNotice("Key rotated");
            }}
          >
            Rotate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={r.status === "revoked"}
            onClick={() => {
              integrationService.revokeKey(r.id);
              setNotice("Key revoked");
            }}
          >
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  const webhookColumns: DataTableColumn<WebhookEndpoint>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "direction", header: "Direction", render: (r) => r.direction },
    {
      key: "url",
      header: "URL",
      render: (r) => <span className="font-mono text-[11px]">{r.url}</span>,
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (r) => (r.enabled ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void onTestWebhook(r)}
        >
          Test
        </Button>
      ),
    },
  ];

  const deliveryColumns: DataTableColumn<WebhookDelivery>[] = [
    {
      key: "at",
      header: "When",
      render: (r) => r.createdAt.slice(0, 19).replace("T", " "),
    },
    { key: "event", header: "Event", render: (r) => r.eventType },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "attempt",
      header: "Attempt",
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
          Enterprise Integration Platform
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Integration Center
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Connectors for Microsoft 365, Google, Slack, CRM, storage, and
          automation ecosystems. Connections and sync in this build are local
          demos — live OAuth is not connected.
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
          <Link href="/dashboard/settings#integrations">
            <Button size="sm" variant="ghost">
              Settings
            </Button>
          </Link>
        </div>
      </Card>

      {tab === "dashboard" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Demo links" value={String(platform.metrics.connectedCount)} />
            <Stat label="Catalog" value={String(platform.metrics.availableCount)} />
            <Stat label="API (24h)" value={String(platform.metrics.apiRequests24h)} />
            <Stat
              label="Webhooks (24h)"
              value={String(platform.metrics.webhookDeliveries24h)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Webhook failures" value={String(platform.metrics.webhookFailures24h)} />
            <Stat label="Sync jobs" value={String(platform.metrics.syncJobs24h)} />
            <Stat label="Conflicts" value={String(platform.metrics.syncConflicts24h)} />
            <Stat label="Errors" value={String(platform.metrics.errorCount)} />
          </div>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Connection status
            </h2>
            <DataTable
              columns={connectionColumns}
              rows={[...platform.connections]}
              rowKey={(r) => r.id}
              emptyTitle="No integrations installed"
              emptyDescription="Browse Available to connect a provider."
              minWidth={720}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Event bridge demo
            </h2>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Publish a connector event onto the Workflow Automation bus.
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
                  Emit {id}
                </Button>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      {tab === "installed" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Installed integrations
          </h2>
          <DataTable
            columns={connectionColumns}
            rows={[...platform.connections]}
            rowKey={(r) => r.id}
            emptyTitle="Nothing installed"
            emptyDescription="Install from the Available catalog."
            minWidth={720}
          />
          {platform.syncJobs[0] ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Latest sync: {platform.syncJobs[0].status} ·{" "}
              {platform.syncJobs[0].recordsProcessed} records · mode{" "}
              {platform.syncJobs[0].mode}
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
                  Protocols: {c.protocols.join(", ")}
                </p>
                <Button
                  size="sm"
                  disabled={busy || installed?.status === "connected"}
                  onClick={() => void onConnect(c.id)}
                >
                  {installed?.status === "connected"
                    ? "Demo connection"
                    : installed
                      ? "Connect (demo)"
                      : "Install demo"}
                </Button>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "logs" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Integration logs
          </h2>
          <DataTable
            columns={logColumns}
            rows={[...platform.logs]}
            rowKey={(r) => r.id}
            emptyTitle="No logs yet"
            emptyDescription="Connect a provider or run diagnostics."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "api_keys" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              API keys
            </h2>
            <Button size="sm" onClick={onCreateKey}>
              Generate key
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
              Copy now (shown once): {createdKeySecret}
            </p>
          ) : null}
          <DataTable
            columns={keyColumns}
            rows={[...platform.apiKeys]}
            rowKey={(r) => r.id}
            emptyTitle="No API keys"
            emptyDescription="Generate a key for REST gateway access."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "webhooks" ? (
        <>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Webhook endpoints
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="agx-ui-control min-w-[240px] flex-1 rounded-xl border px-3 py-2 text-sm"
                placeholder="https://…"
              />
              <Button size="sm" onClick={onCreateWebhook}>
                Add outgoing webhook
              </Button>
            </div>
            <DataTable
              columns={webhookColumns}
              rows={[...platform.webhooks]}
              rowKey={(r) => r.id}
              emptyTitle="No webhooks"
              emptyDescription="Create an outgoing endpoint to test delivery."
              minWidth={720}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Delivery logs
            </h2>
            <DataTable
              columns={deliveryColumns}
              rows={[...platform.deliveries]}
              rowKey={(r) => r.id}
              emptyTitle="No deliveries"
              emptyDescription="Send a test webhook to populate logs."
              minWidth={640}
            />
          </Card>
        </>
      ) : null}

      {tab === "developer" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Developer settings
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
              Sandbox mode
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
              Webhook signing enabled
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
                setNotice("Developer settings saved");
              }}
            >
              Save settings
            </Button>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              API docs placeholder: {platform.developerSettings.apiDocsUrl}
              <br />
              SDK placeholder: {platform.developerSettings.sdkPlaceholderUrl}
            </p>
          </Card>

          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              API explorer
            </h2>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Gateway routes:{" "}
              {platform.gatewayRoutes.map((r) => r.protocol).join(", ")}
            </p>
            <input
              value={explorerPath}
              onChange={(e) => setExplorerPath(e.target.value)}
              className="agx-ui-control w-full rounded-xl border px-3 py-2 font-mono text-sm"
            />
            <Button size="sm" disabled={busy} onClick={() => void onExplore()}>
              Send GET
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
              OAuth providers
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
              GraphQL, WebSocket, and gRPC gateway routes are registered as
              placeholders. Field mapping and sync conflict resolution are
              architecture-ready for backend implementation.
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function connectionStatusLabel(status: IntegrationConnection["status"]): string {
  switch (status) {
    case "connected":
      return "Demo connection";
    case "pending_auth":
      return "Pending (demo)";
    case "error":
      return "Error";
    case "disabled":
      return "Disabled";
    case "installed":
      return "Installed";
    default:
      return "Available";
  }
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

