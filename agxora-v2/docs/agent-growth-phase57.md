# AGXORA AI — Phase 57.0 First-Customer Production Gate

## Purpose

Phase 57.0 makes the Phase 42–56 Growth CRM / Lead Queue operator loop safe for
the first real customer. Phase 56 already provides Agent OS server persistence;
Phase 57 closes the production-readiness gap so demo/local modes cannot silently
run in production.

```
Authenticated user
  → membership organization (requireCurrentActor / session)
  → CRM database persistence
  → Agent OS server persistence (v7)
  → transactional auth/invite/verify/reset email
  → existing Agent OS / Operations / Approval / CRM execution
```

## Production mode matrix

When `NEXT_PUBLIC_AGXORA_ENV=production` (or `NODE_ENV=production`), require:

| Setting | Required value |
|---------|----------------|
| `AGXORA_AUTH_REQUIRED` | `true` |
| Auth mode | `server` |
| `NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE` | `database` |
| `NEXT_PUBLIC_AGXORA_AGENT_OS_PERSISTENCE` | `server` |
| `AGXORA_EMAIL_PROVIDER` | not `none` |
| `AGXORA_USE_MOCKS` | `false` |

Invalid mixed combinations (also rejected in production):

- Agent OS `server` + CRM `local`
- CRM `database` + Agent OS `local`
- Agent OS `server` + auth `local`

Development / local / demo remains permissive.

## Readiness behavior

- `assertProdEnv()` includes Phase 57 gate messages in production.
- `GET /api/health` exposes `productionGate` (public-safe):
  - `enforced`, `ready`, mode summaries, `emailConfigured`, `issueCodes`
  - `status: "not_ready"` when the production gate fails
- Secrets (`DATABASE_URL`, email tokens, passwords) are never returned.

## Onboarding organization binding

Authenticated / server mode must bind Business OS activation to the membership
organization:

1. Prefer `AuthUser.defaultOrganizationId` from `/api/v1/auth/me` (membership).
2. Prefer Organization session org when it matches.
3. If session and auth diverge, **auth/membership wins**.
4. Never mint `org_${randomUUID()}` in authenticated/server mode.

`/api/v1/auth/register`, `/login`, and `/me` return `organizationId` /
`workspaceId` derived from membership — never from client input.

Local demo may still mint a temporary `org_*` id when auth is local.

## Security / org authority

- Server APIs continue to use `requireCurrentActor().organizationId`.
- Client-supplied organization IDs are not authoritative.
- Phase 56 Agent OS protections remain unchanged (v7, org filter, no
  localStorage fallback in server mode).

## Auth email requirement

Production requires transactional auth email (`AGXORA_EMAIL_PROVIDER != none`)
for verification, invite, and password reset flows.

**Not in scope:** outbound CRM sales/follow-up email, marketing email, OAuth.

## Persistence

- AgentsPersistedState remains **version 7**.
- Reuses `AgentOsState` and existing CRM tables.
- No v8. No new Agent OS engine.

## Tests

Dedicated suite: `app/lib/production/firstCustomerGate.test.ts`

Covers production mode matrix, health/readiness secrecy, onboarding org bind,
cross-org preference, email-none gate, and demo/local non-enforcement.

## Explicit Phase 58 deferrals

Phase 58 is **NOT** implemented. Deferred:

- Lead Queue navigation / full surface redesign
- Date picker / due-date UX redesign
- Approvals redesign
- Publishing demotion UI
- New CRM / status actions
