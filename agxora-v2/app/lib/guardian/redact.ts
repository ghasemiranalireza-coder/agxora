import { redactSecrets } from "../business-agent/redact";

const EXTRA_SECRET = /(ya29\.|sk-[a-zA-Z0-9]|xox[baprs]-|ghp_[A-Za-z0-9]|Bearer\s+\S+|AKIA[A-Z0-9]{16})/i;

export function guardianRedact<T>(value: T): T {
  return redactSecrets(value);
}

export function redactEvidence(value: string): string {
  const redacted = guardianRedact(value);
  if (typeof redacted !== "string") return "[redacted]";
  if (EXTRA_SECRET.test(redacted)) {
    return redacted.replace(EXTRA_SECRET, "[redacted]");
  }
  return redacted;
}
