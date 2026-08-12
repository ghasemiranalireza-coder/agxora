/**
 * Phase 43 — password hashing with bcrypt (no custom crypto).
 * Never log passwords. Never return hashes to clients.
 */

import "server-only";

import bcrypt from "bcryptjs";
import { PersistenceError } from "@/app/lib/tenancy/errors";

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

export function assertPasswordPolicy(password: string): void {
  if (!password || password.length < 8) {
    throw new PersistenceError(
      "validation",
      "Password must be at least 8 characters",
    );
  }
}
