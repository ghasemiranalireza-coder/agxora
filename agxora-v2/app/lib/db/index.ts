export { prisma } from "./prisma";
export type { PrismaClient } from "./prisma";

/** True when a DATABASE_URL is configured (server-side only). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
