"use client";

/**
 * Hydrates automation store and wires domain event subscriptions.
 */

import { useEffect, type JSX, type ReactNode } from "react";
import { automationStore } from "../store";
import {
  ensureAutomationEventSubscriptions,
  workflowService,
} from "../services";
import { useAutomationOrganizationId } from "../hooks";

interface AutomationBridgeProps {
  readonly children?: ReactNode;
}

export function AutomationBridge({
  children,
}: AutomationBridgeProps): JSX.Element {
  const organizationId = useAutomationOrganizationId();

  useEffect(() => {
    automationStore.hydrate();
    ensureAutomationEventSubscriptions();
    workflowService.ensureWorkspace(organizationId);
  }, [organizationId]);

  return <>{children ?? null}</>;
}
