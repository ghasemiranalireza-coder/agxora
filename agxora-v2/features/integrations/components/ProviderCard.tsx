"use client";

import { useState, type JSX } from "react";
import { AGStatus } from "@/app/components/ag/AGStatus";
import { BrandTile, brandForCanonicalProvider } from "@/app/components/ui/BrandMark";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { toPersistenceProviderId } from "@/app/lib/integrations/ids";
import type { ResolvedProviderState } from "@/app/lib/integrations/resolver";
import type { ProviderCapability, ProviderUiState } from "@/app/lib/integrations/types";
import { catalogCopy, useT } from "@/app/lib/i18n";
import type { WorkspacePermissionFlags } from "@/app/lib/integrations/permission-flags";

type Props = {
  readonly item: ResolvedProviderState;
  readonly busy: string | null;
  readonly onConnect: (routeId: string) => void;
  readonly onDisconnect: (routeId: string) => void;
  readonly onTogglePermission: (
    routeId: string,
    key: keyof WorkspacePermissionFlags,
    value: boolean,
  ) => void;
};

function statusLabel(state: ProviderUiState, t: ReturnType<typeof useT>): string {
  switch (state) {
    case "connected":
      return t("businessAgent.connected");
    case "available":
      return t("businessAgent.statusAvailable");
    case "requires_authorization":
      return t("businessAgent.statusRequiresAuthorization");
    case "requires_permission":
      return t("businessAgent.statusRequiresPermission");
    case "requires_reauth":
      return catalogCopy(t, "integrations.center.status.requiresReauth", "Reconnect required");
    case "coming_soon":
      return t("common.comingSoon");
    case "unsupported":
      return t("businessAgent.statusUnsupported");
    case "error":
      return catalogCopy(t, "integrations.center.status.error", "Error");
    case "upgrade_required":
      return catalogCopy(t, "integrations.center.status.upgrade", "Upgrade");
    default:
      return t("businessAgent.notConnected");
  }
}

function actionLabel(
  item: ResolvedProviderState,
  t: ReturnType<typeof useT>,
): string {
  switch (item.primaryAction) {
    case "connect":
      return t("businessAgent.connect");
    case "configure":
      return catalogCopy(t, "integrations.center.actions.configure", "Configure");
    case "configure_permissions":
      return catalogCopy(
        t,
        "integrations.center.actions.configurePermissions",
        "Configure permissions",
      );
    case "reconnect":
      return catalogCopy(t, "integrations.center.actions.reconnect", "Reconnect");
    case "coming_soon":
      return t("common.comingSoon");
    case "upgrade":
      return catalogCopy(t, "integrations.center.actions.upgrade", "Upgrade");
    default:
      return t("businessAgent.connectUnavailable");
  }
}

function capabilityLabel(
  capability: ProviderCapability,
  t: ReturnType<typeof useT>,
): string {
  return catalogCopy(
    t,
    `integrations.center.capabilities.${capability}`,
    capability,
  );
}

export function ProviderCard({
  item,
  busy,
  onConnect,
  onDisconnect,
  onTogglePermission,
}: Props): JSX.Element {
  const t = useT();
  const [showPerms, setShowPerms] = useState(
    item.uiState === "requires_permission" || item.connected,
  );
  const routeId = toPersistenceProviderId(item.providerId) ?? item.providerId;
  const actionable =
    item.primaryAction === "connect" ||
    item.primaryAction === "reconnect" ||
    item.primaryAction === "configure" ||
    item.primaryAction === "configure_permissions";
  const categoryLabel = catalogCopy(
    t,
    `integrations.categories.${item.category}`,
    item.category,
  );

  function onPrimary() {
    if (item.primaryAction === "connect" || item.primaryAction === "reconnect") {
      onConnect(routeId);
      return;
    }
    if (
      item.primaryAction === "configure" ||
      item.primaryAction === "configure_permissions"
    ) {
      setShowPerms(true);
    }
  }

  return (
    <Card hover={false} className="agx-integrations__card">
      <header className="agx-integrations__head">
        <div className="agx-integrations__identity">
          <BrandTile id={brandForCanonicalProvider(item.providerId)} />
          <div>
            <strong>{item.displayName}</strong>
            <div className="agx-integrations__meta">
              <span className="agx-integrations__category">{categoryLabel}</span>
              <div className="agx-integrations__badges">
                <AGStatus status={item.uiState}>{statusLabel(item.uiState, t)}</AGStatus>
              </div>
            </div>
            {item.accountLabel ? (
              <div>
                {t("businessAgent.accountEmail")}: {item.accountLabel}
              </div>
            ) : null}
            <small>{item.description}</small>
          </div>
        </div>
        <div className="agx-integrations__actions">
          <Button
            variant={
              item.primaryAction === "connect" || item.primaryAction === "reconnect"
                ? "premium"
                : item.connected
                  ? "outline"
                  : "ghost"
            }
            disabled={!actionable || busy === routeId || busy === item.providerId}
            onClick={() => onPrimary()}
          >
            {actionLabel(item, t)}
          </Button>
          {item.connected ? (
            <Button
              variant="ghost"
              disabled={busy === routeId}
              onClick={() => onDisconnect(routeId)}
            >
              {t("businessAgent.disconnect")}
            </Button>
          ) : null}
        </div>
      </header>
      {item.declaredCapabilities.length > 0 ? (
        <ul className="agx-integrations__caps">
          {item.declaredCapabilities.map((capability) => {
            const implemented = item.implementedCapabilities.includes(capability);
            return (
              <li
                key={capability}
                className={
                  implemented
                    ? "agx-integrations__cap agx-integrations__cap--implemented"
                    : "agx-integrations__cap"
                }
              >
                {capabilityLabel(capability, t)}
                {!implemented
                  ? ` · ${catalogCopy(t, "integrations.center.declaredOnly", "declared")}`
                  : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
      {item.implementationStatus === "available" && showPerms ? (
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
                checked={item.permissions?.[key] ?? false}
                disabled={!item.connected || busy === `${routeId}:${key}`}
                onChange={(event) =>
                  onTogglePermission(routeId, key, event.target.checked)
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
      ) : null}
    </Card>
  );
}
