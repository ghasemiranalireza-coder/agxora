"use client";

import type { JSX } from "react";
import Link from "next/link";
import { AGStatus } from "../ag/AGStatus";
import { BrandTile, brandForCanonicalProvider } from "../ui/BrandMark";
import { Card } from "../ui/Card";
import { catalogCopy, useT } from "../../lib/i18n";
import { useCanonicalIntegrations } from "../../../features/integrations/hooks/useCanonicalIntegrations";

function snapshotLabel(
  state: string,
  t: ReturnType<typeof useT>,
): string {
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
      return catalogCopy(
        t,
        "integrations.center.status.requiresReauth",
        "Reconnect required",
      );
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

/**
 * Live Integration Center projection for the dashboard.
 * Uses canonical resolver state only — never invents connected/healthy/sync.
 */
export function IntegrationsSnapshot(): JSX.Element {
  const t = useT();
  const { providers, loaded, error } = useCanonicalIntegrations();
  const featured = providers.filter(
    (item) =>
      item.implementationStatus === "available" || item.connected,
  );
  const connectedCount = providers.filter((item) => item.connected).length;
  const availableCount = providers.filter(
    (item) => item.uiState === "available" || item.uiState === "requires_authorization",
  ).length;
  const comingSoonCount = providers.filter(
    (item) => item.uiState === "coming_soon",
  ).length;

  return (
    <section
      className="agx-dash-snapshot"
      aria-labelledby="agx-integrations-snapshot-title"
    >
      <Card hover={false} className="agx-dash-snapshot__card">
        <header className="agx-dash-snapshot__head">
          <div>
            <h2 id="agx-integrations-snapshot-title" className="agx-ui-section-title">
              {t("dashboard.snapshot.title")}
            </h2>
            <p className="agx-ui-section-lead">{t("dashboard.snapshot.subtitle")}</p>
          </div>
          <Link className="agx-dash-snapshot__link" href="/dashboard/integrations">
            {t("dashboard.snapshot.open")}
          </Link>
        </header>

        {!loaded ? (
          <p className="agx-dash-snapshot__empty">{t("dashboard.snapshot.loading")}</p>
        ) : error ? (
          <p role="alert" className="agx-dash-snapshot__empty">
            {t("dashboard.snapshot.error")}
          </p>
        ) : featured.length === 0 ? (
          <p className="agx-dash-snapshot__empty">{t("dashboard.snapshot.empty")}</p>
        ) : (
          <ul className="agx-dash-snapshot__list">
            {featured.map((item) => (
              <li key={item.providerId}>
                <BrandTile id={brandForCanonicalProvider(item.providerId)} />
                <div>
                  <strong>{item.displayName}</strong>
                  <AGStatus status={item.uiState}>
                    {snapshotLabel(item.uiState, t)}
                  </AGStatus>
                </div>
              </li>
            ))}
          </ul>
        )}

        {loaded && !error ? (
          <p className="agx-dash-snapshot__meta">
            {connectedCount === 0
              ? t("dashboard.snapshot.noneConnected")
              : t("dashboard.snapshot.connectedCount", { count: connectedCount })}
            {" · "}
            {t("dashboard.snapshot.availableCount", { count: availableCount })}
            {" · "}
            {t("dashboard.snapshot.comingSoonCount", { count: comingSoonCount })}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
