import { createHash } from "node:crypto";
import type { IncidentCategory, ObservationSource } from "./types";

export function guardianFingerprint(input: {
  readonly category: IncidentCategory;
  readonly source: ObservationSource;
  readonly component: string;
  readonly title: string;
}): string {
  const normalized = [
    input.category,
    input.source,
    input.component.trim().toLowerCase(),
    input.title.trim().toLowerCase().replace(/\s+/g, " "),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export function evidenceHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
