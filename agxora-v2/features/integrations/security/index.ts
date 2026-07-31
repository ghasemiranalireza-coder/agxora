/**
 * Secure credential / token storage abstraction — least privilege.
 * UI never receives raw secrets; only vault references.
 */

import type { EncryptedCredentialRef } from "../types";

export interface SecretVault {
  store(input: {
    readonly kind: EncryptedCredentialRef["kind"];
    readonly plaintextPlaceholder: string;
    readonly expiresAt?: string;
  }): EncryptedCredentialRef;
  /** Backend would decrypt — local stub returns null. */
  reveal(vaultRef: string): string | null;
  revoke(vaultRef: string): void;
}

const memory = new Map<string, string>();

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export const localSecretVault: SecretVault = {
  store(input) {
    const vaultRef = `vault_${input.kind}_${createId("s").slice(-10)}`;
    memory.set(vaultRef, input.plaintextPlaceholder);
    return {
      id: createId("cred"),
      vaultRef,
      kind: input.kind,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
  },
  reveal(vaultRef) {
    // Intentionally not exposed to UI layers.
    return memory.get(vaultRef) ?? null;
  },
  revoke(vaultRef) {
    memory.delete(vaultRef);
  },
};

let vault: SecretVault = localSecretVault;

export function setSecretVault(next: SecretVault): void {
  vault = next;
}

export function getSecretVault(): SecretVault {
  return vault;
}
