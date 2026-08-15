# Phase 42.1 — Production Foundation

## Database choice

**PostgreSQL + Prisma 6** is the Phase 42.1 persistence stack.

Why Prisma:
- Mature typed ORM with first-class migrations
- Fits the existing TypeScript / Next.js App Router codebase
- No prior ORM existed (`FutureDatabaseProvider` was a 501 placeholder)

## Schema

Tables: `users`, `organizations`, `workspaces`, `memberships`, `sessions`, `customers`

Roles: `OWNER` | `ADMIN` | `MEMBER`

Tenant ownership is explicit foreign keys (`organizationId`, `workspaceId`) — never JSON-only.

## Environment

```bash
DATABASE_URL=postgresql://USER:PASS@HOST:5432/agxora_dev
NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=local|database
```

- `DATABASE_URL` is **server-only**
- CRM stays on LocalStorage unless `NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database`

Copy `.env.example` → `.env`. Never commit secrets (`.env*` is gitignored).

## Commands

```bash
npm install
npx prisma migrate dev          # or: npm run db:migrate
npm run db:seed                 # deterministic dev fixtures
npm run test                    # vitest against agxora_test
npm run lint
npm run build
```

Test DB (`.env.test`):

```bash
DATABASE_URL=postgresql://agxora:agxora_dev@127.0.0.1:5432/agxora_test
npx prisma migrate deploy
npm run test
```

## Tenancy model

```
User → Membership → Organization → Workspace → Customer
```

`getCurrentActor()` resolves membership from the **server session**.
Client-supplied organization/workspace IDs are never authorization.

## Authorization

Central policy: `app/lib/tenancy/authorize.ts`

| Role   | read | create | update | delete |
|--------|------|--------|--------|--------|
| OWNER  | ✓    | ✓      | ✓      | ✓      |
| ADMIN  | ✓    | ✓      | ✓      | ✓      |
| MEMBER | ✓    | ✓      | ✓      | ✗      |

## CRM persistence flow

```
UI (unchanged)
 → crmDirectoryService
   → local repository (default)
   → OR remoteAdapter → /api/v1/crm/customers
        → requireCurrentActor
        → customerService (validate + authz)
        → Prisma / PostgreSQL
```

## Auth integration status (honest)

Existing auth remains **LocalAuthAdapter** (browser localStorage).

Phase 42.1 adds `/api/v1/auth/ensure` + httpOnly `agxora.server.session` cookie, bridging local identity into Postgres `sessions` / `users` / memberships.

**Limitation:** ensure trusts client-presented local identity.  
**Phase 43 must** replace this with real IdP / credential verification and httpOnly-only sessions.

## Seeds

`npm run db:seed` is idempotent. Sample customers use `isSample=true` (Phase 40 honesty).  
Production seed is blocked unless `AGXORA_ALLOW_PROD_SEED=1`.

## Known limitations

- Notes / documents still LocalStorage in CRM UI *(Contacts: Phase 47; Notes: Phase 48; documents deferred)*
- No Stripe / Mission / Memory / Agents / Action Engine
- Auth ensure is a bridge, not production IdP
- Rate limiting deferred (Phase 46)

## What Phase 43 should complete

1. Production authentication (replace LocalAuth as source of truth)
2. Hard server session issuance (no trusted client bootstrap)
3. Persist CRM contacts/notes alongside customers *(Contacts: Phase 47; Notes: Phase 48)*
4. Migrate organization provider off in-memory Maps
5. Optional: import LocalStorage CRM rows into Postgres with user consent

See also: `docs/PHASE_47_CRM_PROFILE_PERSISTENCE.md`,
`docs/PHASE_48_CRM_NOTES_PERSISTENCE.md`.
