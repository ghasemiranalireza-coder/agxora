import { randomUUID } from "node:crypto";
import { listAvailableProviders, PROVIDER_REGISTRY } from "../../integrations/registry";
import type { GuardianObservation } from "../types";

const PRODUCTION_PROVIDERS = ["gmail", "youtube"] as const;

export function observeArchitecture(now: () => Date = () => new Date()): readonly GuardianObservation[] {
  const available = listAvailableProviders().map((entry) => entry.providerId);
  const extra = available.filter((id) => !(PRODUCTION_PROVIDERS as readonly string[]).includes(id));
  const missing = PRODUCTION_PROVIDERS.filter((id) => !available.includes(id));
  const observations: GuardianObservation[] = [];

  if (extra.length === 0 && missing.length === 0) {
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "architecture",
      timestamp: now().toISOString(),
      severity: "info",
      category: "integration",
      title: "Production providers remain Gmail and YouTube",
      evidence: available.join(","),
      reference: "app/lib/integrations/registry.ts",
      details: { available },
    });
  } else {
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "architecture",
      timestamp: now().toISOString(),
      severity: "high",
      category: "integration",
      title: "Provider availability drift",
      evidence: `extra=${extra.join(",") || "none"} missing=${missing.join(",") || "none"}`,
      reference: "app/lib/integrations/registry.ts",
      details: { extra, missing, available },
    });
  }

  const leaky = PROVIDER_REGISTRY.filter(
    (entry) =>
      entry.implementationStatus !== "available" &&
      entry.implementedCapabilities.length > 0,
  ).map((entry) => entry.providerId);
  if (leaky.length > 0) {
    observations.push({
      id: `gobs_${randomUUID()}`,
      source: "architecture",
      timestamp: now().toISOString(),
      severity: "high",
      category: "architecture",
      title: "Coming-soon provider reports implemented capabilities",
      evidence: leaky.join(","),
      reference: "app/lib/integrations/registry.ts",
      details: { leaky },
    });
  }

  return observations;
}
