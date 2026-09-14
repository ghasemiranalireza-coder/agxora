/**
 * Connector catalog — projection of the canonical provider registry
 * plus connector-specific protocol/event metadata.
 */

import { projectConnectorCatalog } from "@/app/lib/integrations/projections";
import type { ConnectorDefinition, ConnectorId } from "../types";

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] =
  projectConnectorCatalog() as readonly ConnectorDefinition[];

export function getConnectorDefinition(
  id: ConnectorId,
): ConnectorDefinition | undefined {
  return CONNECTOR_CATALOG.find((c) => c.id === id);
}

export function listConnectorsByCategory(
  category?: ConnectorDefinition["category"],
): readonly ConnectorDefinition[] {
  if (!category) return CONNECTOR_CATALOG;
  return CONNECTOR_CATALOG.filter((c) => c.category === category);
}
