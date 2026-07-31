"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import { integrationsStore } from "../store";
import { integrationService } from "../services";
import { useIntegrationsOrganizationId } from "../hooks";

interface IntegrationBridgeProps {
  readonly children?: ReactNode;
}

export function IntegrationBridge({
  children,
}: IntegrationBridgeProps): JSX.Element {
  const organizationId = useIntegrationsOrganizationId();

  useEffect(() => {
    integrationsStore.hydrate();
    integrationService.ensureWorkspace(organizationId);
  }, [organizationId]);

  return <>{children ?? null}</>;
}
