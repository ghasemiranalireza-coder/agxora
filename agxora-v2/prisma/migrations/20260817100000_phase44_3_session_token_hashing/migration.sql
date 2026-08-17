-- Phase 44.3 — hash session tokens at rest (SHA-256 hex; matches Node hashOpaqueToken).

-- Required for digest() during backfill.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add tokenHash column (nullable during backfill).
ALTER TABLE "sessions" ADD COLUMN "tokenHash" TEXT;

-- Step 2: Backfill from existing plaintext session tokens.
UPDATE "sessions"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "tokenHash" IS NULL;

-- Step 3: Enforce NOT NULL and unique lookup index.
ALTER TABLE "sessions" ALTER COLUMN "tokenHash" SET NOT NULL;
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- Step 4: Remove plaintext token storage.
DROP INDEX "sessions_token_key";
ALTER TABLE "sessions" DROP COLUMN "token";
