import type {
  GuardianAuditEvent,
  GuardianIncident,
  GuardianPullRequest,
} from "./types";

export type GuardianStore = {
  getIncident(fingerprint: string): GuardianIncident | undefined;
  upsertIncident(incident: GuardianIncident): GuardianIncident;
  listIncidents(): readonly GuardianIncident[];
  hasAudit(key: string): boolean;
  addAudit(key: string, event: GuardianAuditEvent): boolean;
  listAudit(): readonly GuardianAuditEvent[];
  getPullRequest(fingerprint: string): GuardianPullRequest | undefined;
  putPullRequest(pr: GuardianPullRequest): GuardianPullRequest;
};

export function createMemoryStore(): GuardianStore {
  const incidents = new Map<string, GuardianIncident>();
  const audits = new Map<string, GuardianAuditEvent>();
  const pullRequests = new Map<string, GuardianPullRequest>();

  return {
    getIncident(fingerprint) {
      return incidents.get(fingerprint);
    },
    upsertIncident(incident) {
      const existing = incidents.get(incident.fingerprint);
      if (!existing) {
        incidents.set(incident.fingerprint, incident);
        return incident;
      }
      const merged: GuardianIncident = {
        ...existing,
        lastDetectedAt: incident.lastDetectedAt,
        evidence: incident.evidence,
        severity: incident.severity,
        status: existing.status === "resolved" ? "open" : existing.status,
      };
      incidents.set(incident.fingerprint, merged);
      return merged;
    },
    listIncidents() {
      return [...incidents.values()];
    },
    hasAudit(key) {
      return audits.has(key);
    },
    addAudit(key, event) {
      if (audits.has(key)) return false;
      audits.set(key, event);
      return true;
    },
    listAudit() {
      return [...audits.values()];
    },
    getPullRequest(fingerprint) {
      return pullRequests.get(fingerprint);
    },
    putPullRequest(pr) {
      const existing = pullRequests.get(pr.incidentFingerprint);
      if (existing) return existing;
      pullRequests.set(pr.incidentFingerprint, pr);
      return pr;
    },
  };
}
