/**
 * Load test DATABASE_URL before Prisma client is imported by tests.
 * Then load .env.local so live OpenAI tests can use AGXORA_OPENAI_API_KEY
 * without overriding DATABASE_URL from .env.test.
 * Mock server-only so persistence modules can load under Vitest.
 */
import { config } from "dotenv";
import path from "path";
import { vi } from "vitest";

config({ path: path.resolve(__dirname, ".env.test") });
config({ path: path.resolve(__dirname, ".env.local") });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://agxora:agxora_dev@127.0.0.1:5432/agxora_test";
}

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => ({ get: () => null }),
}));
