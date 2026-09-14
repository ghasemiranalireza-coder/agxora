import type { GuardianIncident, GuardianObservation, ObservationSeverity } from "./types";
import { guardianFingerprint } from "./fingerprint";
import type { GuardianStore } from "./store";

const INCIDENT_SEVERITY: ObservationSeverity[] = ["medium", "high", "critical"];

export function observationsToIncidents(
  observations: readonly GuardianObservation[],
  store: GuardianStore,
  now: Date,
): readonly GuardianIncident[] {
  const incidents: GuardianIncident[] = [];
  for (const observation of observations) {
    if (!INCIDENT_SEVERITY.includes(observation.severity)) continue;
    const fingerprint = guardianFingerprint({
      category: observation.category,
      source: observation.source,
      component: observation.reference ?? observation.source,
      title: observation.title,
    });
    const at = now.toISOString();
    const existing = store.getIncident(fingerprint);
    const incident: GuardianIncident = {
      fingerprint,
      severity: observation.severity,
      category: observation.category,
      source: observation.source,
      title: observation.title,
      firstDetectedAt: existing?.firstDetectedAt ?? at,
      lastDetectedAt: at,
      evidence: observation.evidence,
      affectedComponent: observation.reference ?? observation.source,
      suspectedScope: observation.source,
      status: existing?.status === "duplicate" ? "duplicate" : "open",
    };
    incidents.push(store.upsertIncident(incident));
  }
  return incidents;
}
