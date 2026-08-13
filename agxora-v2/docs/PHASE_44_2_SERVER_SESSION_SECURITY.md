# Phase 44.2 — Server Session & Security Control Plane

## Problem

Settings → Security still listed sessions from `localStorage`
(`app/lib/identity/sessions.ts`) via `useIdentity()`. That store is a
local/demo placeholder. It is **not** the Phase 43 `sessions` table.

In `NEXT_PUBLIC_AGXORA_AUTH_MODE=server` that was an architectural lie:
the panel could show fake device/IP/"trusted" rows while the real
httpOnly `agxora.server.session` cookie was the authority.

## Architecture

```
httpOnly agxora.server.session
  → requireCurrentActor()
  → Actor.userId + Actor.sessionToken
  → Prisma Session rows for that userId
  → public DTO { id, createdAt, expiresAt, current }
```

Current session is the row whose **stored token matches the cookie**.
The client never sends `currentSessionId` or `userId`.

## APIs

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/v1/auth/sessions` | Active (non-revoked, non-expired) sessions for the caller |
| POST | `/api/v1/auth/sessions/[id]/revoke` | Revoke one of the caller's other sessions |
| POST | `/api/v1/auth/sessions/revoke-others` | Revoke all except the current cookie session |
| POST | `/api/v1/auth/logout` | Unchanged — revokes **current** session and clears cookie |

Unauthorized → `401`. Another user's session id → `404` (not `403`, so
existence is not leaked). Revoking the current session via `[id]/revoke`
→ `400` (use logout).

JSON never includes `token`, `passwordHash`, or cookie values.

## Honesty

The Session model does **not** store IP, user-agent, device, last-seen,
or trust flags. The UI does not invent them.

Not implemented (shown as unavailable):

- MFA / 2FA
- SSO / OAuth
- email security alerts
- device fingerprinting / IP history
- password history
- trusted devices
- dedicated change-password (reset flow still exists)

## LocalAuth

`NEXT_PUBLIC_AGXORA_AUTH_MODE=local` still uses the local demo session
store, labeled as demo. Server mode never falls back to localStorage.

## Out of scope

No Stripe, AI, email delivery, agents, Prisma upgrade, schema/migration
changes, or Phase 45 work. Phase 44 invitation logic is unchanged.
