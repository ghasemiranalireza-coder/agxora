# Phase 47 — CRM Profile Persistence (Contacts slice)

## Purpose

Make **CRM Contacts** server-authoritative and persistent on PostgreSQL, using the
existing Phase 42.1–44 tenancy / auth architecture.

This is the Contacts slice of CRM profile persistence. Notes follow in
**Phase 48** (`docs/PHASE_48_CRM_NOTES_PERSISTENCE.md`).

## Why Contacts are being persisted

Phase 42.1 persisted **Customers** to Postgres when
`NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database`, but Contact persons remained in
LocalStorage even in database mode. That split is unsafe for multi-device /
multi-user production CRM. Phase 47 closes that gap for Contacts only.

## Prisma schema

```prisma
model Contact {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  workspaceId    String   @db.Uuid
  customerId     String   @db.Uuid
  name           String
  role           String   @default("")
  email          String   @default("")
  phone          String   @default("")
  mobile         String   @default("")
  notes          String   @default("") // free-text on the person — not CrmNoteRecord
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(..., onDelete: Cascade)
  workspace    Workspace    @relation(..., onDelete: Cascade)
  customer     Customer     @relation(..., onDelete: Cascade)

  @@index([customerId])
  @@index([workspaceId])
  @@index([organizationId])
  @@index([customerId, createdAt])
  @@index([workspaceId, customerId])
  @@map("contacts")
}
```

Deleting a Customer cascades to its Contacts at the database level.

## Migration

`prisma/migrations/20260815130000_phase47_crm_contacts`

## API routes

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/v1/crm/customers/[id]/contacts` | List contacts for a customer |
| `POST` | `/api/v1/crm/customers/[id]/contacts` | Create contact (`{ draft }`) |
| `GET` | `/api/v1/crm/contacts/[id]` | Get one contact |
| `PUT` | `/api/v1/crm/contacts/[id]` | Update contact (`{ draft }`) |
| `DELETE` | `/api/v1/crm/contacts/[id]` | Delete contact |

Conventions match existing CRM customer routes (`ok`, `jsonError`, session actor).

## Authorization model

Contacts reuse **customer.\*** CRM permissions (no separate contact RBAC matrix):

| Role | read | create | update | delete |
|------|------|--------|--------|--------|
| OWNER | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ |
| MEMBER | ✓ | ✓ | ✓ | ✗ |

Server checks:

1. Session actor via `requireCurrentActor` / service `Actor`
2. Parent Customer must exist in **actor.workspaceId**
3. Contact `organizationId` / `workspaceId` must match actor tenancy
4. Client-supplied `organizationId` is **ignored** in database mode

## Database / local mode behavior

| Mode | Customers | Contacts | Notes / documents / activities |
|------|-----------|----------|--------------------------------|
| `local` (default) | LocalStorage | LocalStorage | LocalStorage |
| `database` | PostgreSQL API | PostgreSQL API (Phase 47) | Notes: Phase 48; documents/activities still LocalStorage |

Production expectation: set `NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database` when
server auth + `DATABASE_URL` are live.

## Module layout

```
app/lib/crm/persistence/
  contactRepository.ts
  contactService.ts
  contactService.test.ts
  contact.local.test.ts
  mappers.ts            # + toCrmContactRecord
app/api/v1/crm/customers/[id]/contacts/route.ts
app/api/v1/crm/contacts/[id]/route.ts
app/lib/crm/directory/remoteAdapter.ts  # remote contact helpers
app/lib/crm/directory/service.ts        # database-mode branch for contacts
```

## Tests

- `contactService.test.ts` — CRUD, OWNER/ADMIN/MEMBER, cross-org, cross-workspace,
  customer/contact isolation, invalid IDs, validation, customer delete cascade
- `contact.local.test.ts` — LocalStorage repository contact regression
- Existing customer, auth, control-plane, and Phase 46-A suites must still pass

## Known limitations

- Notes entity persistence is implemented in **Phase 48** — see
  `docs/PHASE_48_CRM_NOTES_PERSISTENCE.md`
- Documents / file blobs remain LocalStorage
- CRM channel integrations unchanged
- Dual-mode default remains `local` until operators flip the flag
- Contact person `notes` string field is persisted; that is **not** the Notes entity

## Deferred to next slice (after Contacts; Notes now Phase 48)

- ~~**Notes** (`CrmNoteRecord` → Postgres)~~ → **Phase 48**
- Documents / blob storage
- Optional consented LocalStorage → Postgres import
- Activities server persistence

## Explicit out of scope

- Notes (entity) — delivered in Phase 48
- Documents / blob storage
- CRM channel integrations
- Stripe / billing
- Redis / distributed rate limiting / Phase 46-B
- MFA / OAuth
- AI expansion or AI persistence
- Browser matrix / Playwright
- Ownership-transfer redesign
- Unrelated dashboard UI redesign

See also: `docs/PHASE_48_CRM_NOTES_PERSISTENCE.md`.
