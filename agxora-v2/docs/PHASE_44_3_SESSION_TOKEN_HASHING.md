# Phase 44.3 — Session Token Hashing at Rest

## Purpose

Security hardening slice continuing Phase 43/44 session work. Eliminates
plaintext storage of server session tokens in PostgreSQL while preserving the
existing httpOnly cookie contract.

Before Phase 44.3, `sessions.token` stored the raw opaque cookie value.
Password-reset, email-verification, invitation, and ownership-transfer tokens
already used SHA-256 hashes only — sessions were the lone exception.

## Architecture

```
Login / Register
  → createOpaqueToken()           // raw cookie value (memory only)
  → Set-Cookie agxora.server.session (httpOnly)
  → PostgreSQL Session.tokenHash = hashSessionToken(rawToken)

Subsequent request
  → read httpOnly cookie
  → hashSessionToken(rawToken)
  → prisma.session.findUnique({ where: { tokenHash } })
  → getCurrentActor() / authorize unchanged
```

Raw session tokens are **never** written to PostgreSQL after migration.

## Schema

Migration: `prisma/migrations/20260817100000_phase44_3_session_token_hashing`

| Change | Purpose |
|--------|---------|
| `Session.tokenHash` unique | Lookup key (SHA-256 hex) |
| Drop `Session.token` | Remove plaintext at rest |

### Migration strategy

1. Add nullable `tokenHash` column.
2. Backfill: `tokenHash = SHA256(token)` for all existing rows using PostgreSQL
   `digest(token, 'sha256')` (matches Node `hashOpaqueToken` / UTF-8 input).
3. Set `tokenHash` NOT NULL + unique index.
4. Drop plaintext `token` column and its unique index.

**No session invalidation required** when backfill succeeds — existing cookies
continue to work because lookup hashes the incoming cookie the same way.

If backfill cannot run (empty or corrupt token rows), operators must invalidate
sessions and force re-login instead of deploying a half-migrated schema.

## Hash function

Reuses `hashSessionToken()` → `hashOpaqueToken()` in
`app/lib/auth/server/tokens.ts`:

- SHA-256 over UTF-8 token string
- Hex digest (same as invitation / reset / verify tokens)

## Updated lookup paths

| Module | Function |
|--------|----------|
| `app/lib/tenancy/actor.ts` | `resolveActorFromToken`, `getActorForWorkspace` |
| `app/lib/auth/server/service.ts` | `createServerSession`, `logoutSession`, `getSessionPublic`, `switchActiveWorkspace` |
| `app/lib/auth/server/managedSessions.ts` | list / revoke / revoke-others current-session detection |

`Actor.sessionToken` remains the **raw cookie token** (in-memory only) for
managed-session comparisons; PostgreSQL stores only `tokenHash`.

## Security guarantees

- Raw session token never persisted in PostgreSQL after migration
- Raw token never returned in auth/session API JSON (unchanged from Phase 43)
- Raw token never logged by session modules
- Invalid / expired / revoked sessions remain fail-closed

## Unchanged

- Cookie name (`agxora.server.session`)
- httpOnly / SameSite / Secure flags
- Session expiration and revocation semantics
- Tenancy, authorization, CRM, rate limiting
- Password-reset / verify / invitation token hashing

## Tests

- `app/lib/auth/server/auth.service.test.ts` — Phase 44.3 hashing regression
- `app/lib/auth/server/managedSessions.test.ts` — session list/revoke regression
- `app/lib/auth/server/sessionTestFixtures.ts` — hashed test session rows
- Full suite: `npm test`

## Known limitations

- Cookie theft in transit/browser still valid until expiry/revocation (unchanged)
- Edge `proxy.ts` still uses soft `validateSessionToken` length check only
- Does not add MFA, device binding, or session metadata (IP/UA)

## Explicit out of scope

OrganizationProvider migration, CRM, rate limits, MFA/OAuth, blob storage,
Stripe, AI, monitoring, Playwright.

See also: `docs/PHASE_43_REAL_AUTHENTICATION.md`,
`docs/PHASE_44_2_SERVER_SESSION_SECURITY.md`.
