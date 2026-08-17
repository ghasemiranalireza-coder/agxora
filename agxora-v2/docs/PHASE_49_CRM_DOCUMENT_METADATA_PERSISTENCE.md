# Phase 49 — CRM Document Metadata Persistence

## Purpose

Make **CRM Document metadata** (`CrmDocumentRecord`) server-authoritative and
persistent on PostgreSQL, using the existing Phase 42.1–48 tenancy / auth
architecture.

This is the **metadata-only** slice. **No binary/blob storage** is implemented.
Activities remain deferred.

## Why document metadata is being persisted

Phase 48 persisted Notes in database mode. Document metadata stayed on
LocalStorage even when customers/contacts/notes were server-backed. Phase 49
closes that gap for document metadata only, following the Contact/Note
implementation pattern.

The existing UI already stores only metadata (`name`, `mimeType`, `size`,
`uploadedBy`, timestamps) — file bytes are never persisted locally either.

## Prisma schema

```prisma
model CustomerDocument {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  workspaceId    String   @db.Uuid
  customerId     String   @db.Uuid
  name           String
  mimeType       String   @default("application/octet-stream")
  size           Int      @default(0)
  uploadedBy     String   @default("") // display string (CrmDocumentRecord pattern)
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
  @@map("customer_documents")
}
```

Deleting a Customer cascades to its document metadata rows at the database level.

## Migration

`prisma/migrations/20260815150000_phase49_crm_documents`

## API routes

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/v1/crm/customers/[id]/documents` | List document metadata for a customer |
| `POST` | `/api/v1/crm/customers/[id]/documents` | Create document metadata (`{ draft }`) |
| `GET` | `/api/v1/crm/documents/[id]` | Get one document metadata row |
| `DELETE` | `/api/v1/crm/documents/[id]` | Delete document metadata |

No `PUT`/`PATCH` — the current CRM UI does not update document metadata after
create.

Conventions match Phase 47/48 (`ok`, `jsonError`, session actor).

## Authorization model

Documents reuse **customer.\*** CRM permissions:

| Role | read | create | delete |
|------|------|--------|--------|
| OWNER | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ |
| MEMBER | ✓ | ✓ | ✗ |

Server checks:

1. Session actor via `requireCurrentActor` / service `Actor`
2. Parent Customer must exist in **actor.workspaceId**
3. Document `organizationId` / `workspaceId` must match actor tenancy
4. Client-supplied `organizationId` is **ignored** in database mode
5. Documents cannot be moved between customers/tenants

## Database / local mode behavior

| Mode | Customers | Contacts | Notes | Documents | Activities |
|------|-----------|----------|-------|-----------|------------|
| `local` (default) | LocalStorage | LocalStorage | LocalStorage | LocalStorage | LocalStorage |
| `database` | PostgreSQL API | PostgreSQL API | PostgreSQL API | PostgreSQL API (Phase 49) | **Still LocalStorage** |

## Module layout

```
app/lib/crm/persistence/
  documentRepository.ts
  documentService.ts
  documentService.test.ts
  document.local.test.ts
  mappers.ts            # + toCrmDocumentRecord
app/api/v1/crm/customers/[id]/documents/route.ts
app/api/v1/crm/documents/[id]/route.ts
app/lib/crm/directory/remoteAdapter.ts  # remote document helpers
app/lib/crm/directory/service.ts      # database-mode branch for documents
```

## Tests

- `documentService.test.ts` — list/create/get/delete, OWNER/ADMIN/MEMBER,
  cross-org, cross-workspace, customer/document isolation, invalid IDs,
  validation, customer delete cascade
- `document.local.test.ts` — LocalStorage repository document metadata regression
- Existing customer, contact, note, auth, control-plane, and Phase 46-A suites
  must still pass

## Known limitations

- **No binary/blob storage** — file content is not persisted server-side or
  locally beyond existing browser `File` picker semantics
- No downloads, presigned URLs, S3, or object storage
- Activities remain LocalStorage
- Dual-mode default remains `local` until operators flip the flag
- Document metadata cannot be edited after create (matches current UI)

## Explicitly deferred

- Binary/blob storage (S3, filesystem, presigned URLs, upload infrastructure)
- Activities server persistence
- Optional consented LocalStorage → Postgres import
- Stripe / billing
- Redis / distributed rate limiting / Phase 46-B
- MFA / OAuth
- AI expansion or AI persistence
- Browser matrix / Playwright
- Ownership-transfer redesign
- CRM channel integrations
