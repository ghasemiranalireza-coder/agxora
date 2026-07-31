/**
 * Event bridge — connectors ↔ Workflow Automation Engine.
 */

import {
  publishDomainEvent,
  subscribeDomainEvent,
} from "@/features/automation/event-bus";
import type { DomainEvent } from "@/features/automation/types";
import type { ConnectorId } from "../types";

export type IntegrationEventHandler = (
  event: DomainEvent,
) => void | Promise<void>;

/** Publish an integration event onto the shared automation event bus. */
export function publishIntegrationEvent(input: {
  readonly organizationId: string;
  readonly connectorId: ConnectorId;
  readonly eventType: string;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
}): DomainEvent {
  return publishDomainEvent({
    type: input.eventType.startsWith("integration.")
      ? input.eventType
      : `integration.${input.connectorId}.${input.eventType}`,
    organizationId: input.organizationId,
    source: `connector:${input.connectorId}`,
    payload: {
      connectorId: input.connectorId,
      ...(input.payload ?? {}),
    },
    correlationId: input.correlationId,
  });
}

/** Subscribe to automation/domain events for connector consumption. */
export function subscribeIntegrationEvents(
  type: string | "*",
  handler: IntegrationEventHandler,
): () => void {
  return subscribeDomainEvent(type, handler);
}

export function bridgeConnectorToWorkflows(input: {
  readonly organizationId: string;
  readonly connectorId: ConnectorId;
  readonly eventType: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}): DomainEvent {
  return publishIntegrationEvent(input);
}
