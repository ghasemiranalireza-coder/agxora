"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import { agentsStore } from "../store";
import { agentOsService } from "../services";
import { useAgentsOrganizationId } from "../hooks";

interface AgentOsBridgeProps {
  readonly children?: ReactNode;
}

export function AgentOsBridge({
  children,
}: AgentOsBridgeProps): JSX.Element {
  const organizationId = useAgentsOrganizationId();

  useEffect(() => {
    agentsStore.hydrate();
    agentOsService.ensureWorkspace(organizationId);
  }, [organizationId]);

  return <>{children ?? null}</>;
}
