"use client";

import { useEffect, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { catalogCopy, localizeThrownError, localizeIntegrationMessage, useT } from "@/app/lib/i18n";
import { integrationsStore } from "../store";
import { integrationService } from "../services";
import { useIntegrationPlatform } from "../hooks";
import type {
  ApiKeyRecord,
  IntegrationLogEntry,
  WebhookDelivery,
  WebhookEndpoint,
} from "../types";

/**
 * Local developer tools (API keys, webhooks, explorer).
 * These are NOT provider connection state and must never claim a live
 * third-party connection from localStorage.
 */
export function IntegrationDeveloperTools(): JSX.Element {
  const t = useT();
  const platform = useIntegrationPlatform();
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

  const onCreateKey = () => {
    const key = integrationService.createKey({
      organizationId: platform.organizationId,
      name: t("integrations.generated.keyName", { n: platform.apiKeys.length + 1 }),
      scopes: ["integrations.read", "webhooks.manage", "api:write"],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setCreatedKeySecret(key.secretOnce ?? null);
    setNotice(t("integrations.notice.keyCreated", { prefix: key.prefix }));
  };

  const onCreateWebhook = () => {
    const endpoint = integrationService.createWebhook({
      organizationId: platform.organizationId,
      name: t("integrations.generated.webhookName", { n: platform.webhooks.length + 1 }),
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
      setNotice(localizeThrownError(t, err, "integrations.notice.explorerFailed"));
    } finally {
      setBusy(false);
    }
  };

  const logColumns: DataTableColumn<IntegrationLogEntry>[] = [
    {
      key: "at",
      header: t("integrations.columns.when"),
      render: (r) => r.at.slice(0, 19).replace("T", " "),
    },
    { key: "level", header: t("integrations.columns.level"), render: (r) => r.level },
    { key: "source", header: t("integrations.columns.source"), render: (r) => r.source },
    { key: "message", header: t("integrations.columns.message"), render: (r) =>
      localizeIntegrationMessage(t, r.message, r.data)
    },
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
    {
      key: "url",
      header: t("integrations.columns.url"),
      render: (r) => <span className="font-mono text-[11px]">{r.url}</span>,
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
  ];

  if (!platform.hydrated) {
    return (
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("integrations.loading")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
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
        </Card>
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("integrations.developer.explorerTitle")}
          </h2>
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
      </div>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {catalogCopy(
          t,
          "integrations.center.developerHint",
          "Developer tools are local workspace utilities. They are not a live provider connection.",
        )}
      </p>
    </div>
  );
}
