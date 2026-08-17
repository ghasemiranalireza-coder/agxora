# Phase 48 — CRM Notes Persistence

## Purpose

Make **CRM Notes** (`CrmNoteRecord`) server-authoritative and persistent on
PostgreSQL, using the existing Phase 42.1–47 tenancy / auth architecture.

This is the Notes-only slice. **Document metadata is Phase 49; Activities remain deferred.**

## Why Notes are being persisted

Phase 47 persisted Contacts in database mode. Notes stayed on LocalStorage even
when customers/contacts were server-backed. Phase 48 closes that gap for Notes
only, following the Contact implementation pattern.

**Not** the Contact person free-text `notes` string field — that remains a
Contact attribute from Phase 47.

## Prisma schema

```prisma
model Note {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  workspaceId    String   @db.Uuid
  customerId     String   @db.Uuid
  title          String
  body           String
  author         String   @default("") // display string (CrmNoteRecord pattern)
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
  @@map("notes")
}
```

Deleting a Customer cascades to its Notes at the database level.

## Migration

`prisma/migrations/20260815140000_phase48_crm_notes`

## API routes

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/v1/crm/customers/[id]/notes` | List notes for a customer |
| `POST` | `/api/v1/crm/customers/[id]/notes` | Create note (`{ draft }`) |
| `GET` | `/api/v1/crm/notes/[id]` | Get one note |
| `PUT` | `/api/v1/crm/notes/[id]` | Update note (`{ draft }`) |
| `DELETE` | `/api/v1/crm/notes/[id]` | Delete note |

Conventions match Phase 47 Contacts (`ok`, `jsonError`, session actor).

## Authorization model

Notes reuse **customer.\*** CRM permissions:

| Role | read | create | update | delete |
|------|------|--------|--------|--------|
| OWNER | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ |
| MEMBER | ✓ | ✓ | ✓ | ✗ |

Server checks:

1. Session actor via `requireCurrentActor` / service `Actor`
2. Parent Customer must exist in **actor.workspaceId**
3. Note `organizationId` / `workspaceId` must match actor tenancy
4. Client-supplied `organizationId` is **ignored** in database mode
5. Updates cannot move a note between customers/tenants

## Database / local mode behavior

| Mode | Customers | Contacts | Notes | Documents | Activities |
|------|-----------|----------|-------|-----------|------------|
| `local` (default) | LocalStorage | LocalStorage | LocalStorage | LocalStorage | LocalStorage |
| `database` | PostgreSQL API | PostgreSQL API | PostgreSQL API (Phase 48) | PostgreSQL API (Phase 49) | PostgreSQL API (Phase 50) |

## Module layout

```
app/lib/crm/persistence/
  noteRepository.ts
  noteService.ts
  noteService.test.ts
  note.local.test.ts
  mappers.ts            # + toCrmNoteRecord
app/api/v1/crm/customers/[id]/notes/route.ts
app/api/v1/crm/notes/[id]/route.ts
app/lib/crm/directory/remoteAdapter.ts  # remote note helpers
app/lib/crm/directory/service.ts        # database-mode branch for notes
```

## Tests

- `noteService.test.ts` — CRUD, OWNER/ADMIN/MEMBER, cross-org, cross-workspace,
  customer/note isolation, invalid IDs, validation, customer delete cascade
- `note.local.test.ts` — LocalStorage repository note regression
- Existing customer, contact, auth, control-plane, and Phase 46-A suites must still pass

## Known limitations

- Document metadata is persisted in **Phase 49** (`docs/PHASE_49_CRM_DOCUMENT_METADATA_PERSISTENCE.md`); binary/blob storage remains deferred
- Activities are persisted in **Phase 50** (`docs/PHASE_50_CRM_ACTIVITIES_PERSISTENCE.md`)
- Dual-mode default remains `local` until operators flip the flag
- Contact.`notes` string is unrelated to this entity

## Explicitly deferred

- Binary/blob storage (S3, filesystem, presigned URLs) — see Phase 49 for metadata-only persistence
- ~~Activities server persistence~~ → **Phase 50**
- Optional consented LocalStorage → Postgres import
- Stripe / billing
- Redis / distributed rate limiting / Phase 46-B
- MFA / OAuth
- AI expansion or AI persistence
- Browser matrix / Playwright
- Ownership-transfer redesign
- CRM channel integrations
