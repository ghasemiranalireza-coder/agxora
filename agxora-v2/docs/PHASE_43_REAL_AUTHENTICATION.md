# Phase 43 — Real Authentication & Trusted Identity

## Architecture

AGXORA uses a **custom Next.js App Router authentication stack** on top of
PostgreSQL / Prisma (Phase 42.1). No competing IdP libraries (Clerk / Auth0 /
NextAuth) were installed — the existing `AuthProviderPort` contract is preserved
with a new `ServerAuthAdapter`.

```
Login/Register
  → bcrypt password verify/hash (server)
  → create Session row (high-entropy token)
  → Set-Cookie agxora.server.session (httpOnly, SameSite=lax, Secure in prod)
  → subsequent request
  → read cookie / optional Bearer (tests)
  → getCurrentActor() from Session → User → Membership
  → authorize (Phase 42.1 policies)
```

## Why this fits App Router

- Route handlers (`app/api/v1/auth/*`) run on the Node runtime with `server-only`
- Cookies via `next/headers` and `NextResponse.cookies`
- `getCurrentActor()` / `requireCurrentActor()` already used by CRM APIs
- Client adapter only holds UI state; authority is the httpOnly cookie

## Auth mode

| Mode | Env | Use |
|------|-----|-----|
| `server` | `NEXT_PUBLIC_AGXORA_AUTH_MODE=server` (default when CRM=database) | Production path |
| `local` | `NEXT_PUBLIC_AGXORA_AUTH_MODE=local` | Offline LocalAuth demo — **not** production identity |

## Retired trust paths

- `/api/v1/auth/ensure` → **410 Gone** (no longer mints sessions from client claims)
- `AuthServerBridge` → no-op (clears legacy sessionStorage token)
- Client `userId` / `email` / `organizationId` / `workspaceId` / `role` are never authority

## Password security

- bcrypt (cost 12) via `bcryptjs`
- Hashes never returned in API JSON
- Generic login errors: `Invalid email or password`

## Sessions

- Server `sessions` table with `tokenHash` (SHA-256 of cookie token), `expiresAt`, `revokedAt`, `activeWorkspaceId`
- Logout sets `revokedAt` and clears cookie
- Password reset revokes all user sessions
- Fresh session issued on every login (fixation protection)

## Password reset / email verification

- `password_reset_tokens` / `email_verification_tokens` store **hashed** tokens only
- Email delivery: **not configured** — APIs never claim "email sent"
- Dev/test: `AGXORA_AUTH_EXPOSE_RESET_TOKEN=1` returns raw reset token for automation

## Workspace switch

- `POST /api/v1/auth/workspace` with `{ workspaceId }`
- Server verifies ACTIVE membership; updates `session.activeWorkspaceId` only
- Does not change user identity, org ownership, or role

## Migration from Phase 42.1 LocalAuth

1. Old LocalAuth localStorage identities are **not** trusted
2. Users must register or use seeded bcrypt accounts (`AgxoraSeed!23` in seed)
3. Old `/auth/ensure` sessions that were client-token copies remain until expiry/revocation;
   new logins always create server-issued tokens
4. Do **not** auto-convert arbitrary LocalAuth users into production users

## Future OAuth / MFA extension point

Keep `User.passwordHash` nullable. Add an `AuthIdentity` table later:

```
AuthIdentity { userId, provider, providerSubject, ... }
```

Password, Google, Microsoft, SSO, and MFA factors can attach to the same `User`
without changing membership/tenancy.

## Phase 46 still owns

Rate limiting, advanced API security, abuse prevention, monitoring, full security
audit, browser matrix QA.
