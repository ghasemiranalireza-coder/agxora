"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useOrganization } from "@/app/lib/organization";
import { useOptionalAuth } from "@/app/lib/auth";
import { integrationsStore } from "../store";
import { computeIntegrationMetrics } from "../observability";
import { CONNECTOR_CATALOG } from "../connectors";
import { integrationService } from "../services";
import { listOAuthProviders } from "../oauth";

const LOCAL_ORG = "org_local_default";

export function useIntegrationsOrganizationId(): string {
  const { organization } = useOrganization();
  return organization?.id ?? LOCAL_ORG;
}

export function useIntegrationPlatform() {
  const organizationId = useIntegrationsOrganizationId();
  const auth = useOptionalAuth();
  const snapshot = useSyncExternalStore(
    (l) => integrationsStore.subscribe(l),
    () => integrationsStore.getSnapshot(),
    () => integrationsStore.getSnapshot(),
  );

  const connections = useMemo(
    () =>
      snapshot.connections.filter((c) => c.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const webhooks = useMemo(
    () => snapshot.webhooks.filter((w) => w.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const deliveries = useMemo(
    () =>
      snapshot.deliveries.filter((d) => d.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const apiKeys = useMemo(
    () => snapshot.apiKeys.filter((k) => k.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const apiRequests = useMemo(
    () =>
      snapshot.apiRequests.filter((r) => r.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const syncJobs = useMemo(
    () => snapshot.syncJobs.filter((s) => s.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const logs = useMemo(
    () => snapshot.logs.filter((l) => l.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const metrics = useMemo(
    () =>
      computeIntegrationMetrics({
        connections,
        apiRequests,
        deliveries,
        syncJobs,
        apiKeys,
      }),
    [connections, apiRequests, deliveries, syncJobs, apiKeys],
  );

  return {
    hydrated: snapshot.hydrated,
    organizationId,
    userId: auth?.userId ?? null,
    catalog: CONNECTOR_CATALOG,
    connections,
    webhooks,
    deliveries,
    apiKeys,
    apiRequests,
    syncJobs,
    logs,
    metrics,
    oauthProviders: listOAuthProviders(),
    gatewayRoutes: integrationService.listGatewayRoutes(),
    developerSettings: integrationService.getDeveloperSettings(organizationId),
  };
}
