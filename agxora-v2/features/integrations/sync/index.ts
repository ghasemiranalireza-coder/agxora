/**
 * Sync engine — one-way, two-way, manual, scheduled; conflict placeholders.
 */

import { mapRecord } from "../mapping";
import type {
  DataMappingProfile,
  SyncJob,
  SyncMode,
} from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function runSyncJob(input: {
  readonly organizationId: string;
  readonly connectionId: string;
  readonly mode: SyncMode;
  readonly mapping?: DataMappingProfile;
  readonly records?: readonly Readonly<Record<string, unknown>>[];
  readonly scheduleCron?: string;
}): Promise<SyncJob> {
  const startedAt = nowIso();
  const sourceRecords = input.records ?? [
    { id: "1", name: "Sample", email: "sample@example.com" },
  ];

  let processed = 0;
  let conflicts = 0;
  let error: string | undefined;
  let status: SyncJob["status"] = "succeeded";

  try {
    for (const record of sourceRecords) {
      if (input.mapping) {
        mapRecord(record, input.mapping.rules);
      }
      processed += 1;
      // Conflict placeholder: simulate rare conflict on two-way
      if (input.mode === "two_way" && processed % 7 === 0) {
        conflicts += 1;
      }
    }
    if (conflicts > 0) status = "conflict";
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : "Sync failed";
  }

  return {
    id: createId("sync"),
    organizationId: input.organizationId,
    connectionId: input.connectionId,
    mode: input.mode,
    status,
    mappingProfileId: input.mapping?.id,
    startedAt,
    finishedAt: nowIso(),
    recordsProcessed: processed,
    conflicts,
    error,
    scheduleCron: input.scheduleCron,
  };
}
