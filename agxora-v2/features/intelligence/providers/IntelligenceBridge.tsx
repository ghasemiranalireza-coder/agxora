"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import { intelligenceStore } from "../store";
import { intelligenceService } from "../services";
import { useIntelligenceOrganizationId } from "../hooks";

interface IntelligenceBridgeProps {
  readonly children?: ReactNode;
}

export function IntelligenceBridge({
  children,
}: IntelligenceBridgeProps): JSX.Element {
  const organizationId = useIntelligenceOrganizationId();

  useEffect(() => {
    intelligenceStore.hydrate();
    intelligenceService.ensureWorkspace(organizationId);
  }, [organizationId]);

  return <>{children ?? null}</>;
}
