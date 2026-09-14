import { randomUUID } from "node:crypto";
import type { GuardianAuditEvent } from "./types";
import type { GuardianStore } from "./store";
import { guardianRedact } from "./redact";
import { evidenceHash } from "./fingerprint";

export function recordGuardianAudit(
  store: GuardianStore,
  input: {
    readonly action: string;
    readonly fingerprint?: string;
    readonly details?: Record<string, unknown>;
    readonly at?: string;
  },
): GuardianAuditEvent | null {
  const details = guardianRedact(input.details ?? {});
  const key = [
    input.action,
    input.fingerprint ?? "run",
    evidenceHash(JSON.stringify(details)),
  ].join(":");
  const event: GuardianAuditEvent = {
    id: `gae_${randomUUID()}`,
    at: input.at ?? new Date().toISOString(),
    action: input.action,
    fingerprint: input.fingerprint,
    details,
  };
  const added = store.addAudit(key, event);
  return added ? event : null;
}
