# Phase 50 — CRM Activities Persistence

## Purpose

Make **CRM profile activities** (`CrmActivityRecord`) server-authoritative and
persistent on PostgreSQL when `NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE=database`,
while preserving existing LocalStorage behavior in `local` mode.

Activities are an **immutable, append-only event log** for the customer profile
Activity tab. They are **not** user-created through a public API — they are
appended server-side after successful CRM entity mutations.

## Distinction from other activity systems

Three separate systems must not be merged:

| System | Location | Purpose |
|--------|----------|---------|
| **CRM profile activities** | `CrmActivityRecord`, `customer_activities` | Customer profile Activity tab timeline |
| **Dashboard activity feed** | `backend/activity/feed.ts` `recordActivity()` | In-memory workspace dashboard feed |
| **IAM audit** | `ControlPlaneAuditEvent` | Control-plane / security audit trail |

Phase 50 only persists CRM profile activities.

## Prisma schema

```prisma
model CustomerActivity {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  workspaceId    String   @db.Uuid
  customerId     String   @db.Uuid
  kind           String
  title          String
  detail         String   @default("")
  actor          String   @default("")
  createdAt      DateTime @default(now())

  organization Organization @relation(..., onDelete: Cascade)
  workspace    Workspace    @relation(..., onDelete: Cascade)
  customer     Customer     @relation(..., onDelete: Cascade)

  @@index([customerId])
  @@index([workspaceId])
  @@index([organizationId])
  @@index([customerId, createdAt])
  @@index([workspaceId, customerId])
  @@map("customer_activities")
}
```

- No `updatedAt` — activities are immutable.
- No Contact / Note / Document foreign keys — activities reference only the parent customer.
- Deleting a Customer cascades to its activity rows.

## Migration

`prisma/migrations/20260815160000_phase50_crm_activities`

Additive only — no destructive database changes.

## API routes (GET-only)

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/v1/crm/customers/[id]/activities` | List activities for a customer |
| `GET` | `/api/v1/crm/activities/[id]` | Get one activity |

**Not implemented:** POST, PUT, PATCH, DELETE — activities are not client-spoofable.

Conventions match Phase 47–49 (`requireCurrentActor`, `ok`, `jsonError`).

## Authorization model

Activities reuse **customer.*** CRM permissions — no activity-specific permission matrix:

| Role | read activities | activity emission |
|------|-----------------|-------------------|
| OWNER | ✓ (`customer.read`) | via authorized CRM mutations |
| ADMIN | ✓ | via authorized CRM mutations |
| MEMBER | ✓ | via authorized create/update mutations only (no delete) |

Server checks:

1. Session actor resolved via `requireCurrentActor`
2. Parent Customer must exist in **actor.workspaceId**
3. Activity `organizationId` must match actor tenancy
4. Client-supplied `organizationId` / `workspaceId` are **ignored**

## Tenant isolation

- Organization / workspace derived from authenticated actor and parent customer.
- Cross-org → `403 forbidden` (fail closed).
- Cross-workspace → `404 not_found` (fail closed).
- Wrong customer → `404 not_found`.
- Invalid IDs → safe failure (not found / validation).

## Server-side activity emission

Activities are appended internally after successful CRM mutations via
`appendActivityRecord()` — never through HTTP.

| Service | Mutation | Kind | Actor |
|---------|----------|------|-------|
| `customerService` | create | `customer_created` | `customer.owner` |
| `customerService` | update | `customer_updated` | `customer.owner` |
| `customerService` | delete | **none** | — |
| `contactService` | create | `contact_added` | `"System"` |
| `contactService` | update | `contact_updated` | `"System"` |
| `contactService` | delete | `contact_deleted` | `"System"` |
| `noteService` | create | `note_added` | `note.author` |
| `noteService` | update | `note_updated` | `note.author` |
| `noteService` | delete | `note_deleted` | `note.author` |
| `documentService` | create | `document_added` | `document.uploadedBy` |
| `documentService` | delete | `document_deleted` | `"System"` |

Payload builders in `activityEmitter.ts` mirror LocalStorage `pushActivity()` semantics.

**Not wired:** `project_linked` (`recordProjectLinked()` remains unused).
**Not emitted:** `customer_deleted` (local mode does not emit it either).

## Database / local mode behavior

| Mode | Customers | Contacts | Notes | Documents | Activities |
|------|-----------|----------|-------|-----------|------------|
| `local` (default) | LocalStorage | LocalStorage | LocalStorage | LocalStorage | LocalStorage (`pushActivity`) |
| `database` | PostgreSQL API | PostgreSQL API | PostgreSQL API | PostgreSQL API | PostgreSQL API (Phase 50) |

In `database` mode:

- `listActivities()` → `remoteListActivities()` → GET API
- Activity writes happen server-side through entity services
- No client-side activity append

In `local` mode:

- Existing `pushActivity()` / `listActivities()` in `directory/repository.ts` unchanged
- 500-item global cap still applies in LocalStorage

**Database cap:** PostgreSQL has **no 500-item cap** in Phase 50. LocalStorage
mode retains its global 500-item limit across the entire CRM DB. This difference
is intentional — database mode can grow unbounded until a future retention policy
is defined.

## Module layout

```
app/lib/crm/persistence/
  activityRepository.ts   # append, list, get
  activityService.ts      # authz + read API
  activityEmitter.ts      # payload builders (mirror pushActivity)
  activityService.test.ts
  activity.local.test.ts
  mappers.ts              # + toCrmActivityRecord
app/api/v1/crm/customers/[id]/activities/route.ts
app/api/v1/crm/activities/[id]/route.ts
app/lib/crm/directory/remoteAdapter.ts  # remoteListActivities
app/lib/crm/directory/service.ts        # database-mode branch for activities
```

Entity services (`customerService`, `contactService`, `noteService`, `documentService`)
call `appendActivityRecord()` after successful mutations.

## Tests

- `activityService.test.ts` — list/get, OWNER/ADMIN/MEMBER, cross-org,
  cross-workspace, wrong-customer isolation, invalid IDs, customer delete cascade,
  no `customer_deleted`, emission for all entity types, title/detail/actor parity
- `activity.local.test.ts` — LocalStorage regression (pushActivity, 500-cap)
- Existing customer, contact, note, document, auth, control-plane, and Phase 46-A
  suites must still pass

Run: `npm test` and `npm run build`

## Known limitations

- **No LocalStorage → PostgreSQL import** — pre-existing LocalStorage activities
  are not migrated in this phase
- **No 500-item database cap** — differs from LocalStorage global cap
- **`project_linked` not wired** — `recordProjectLinked()` remains unused
- **`customer_deleted` not emitted** — matches local behavior
- **No public activity CRUD** — append-only via entity mutations
- Dual-mode default remains `local` until operators flip the flag

## Explicit out of scope

- Binary/blob storage, file upload, downloads, presigned URLs
- LocalStorage import
- Redis / distributed rate limiting / Phase 46-B
- MFA / OAuth
- Stripe / billing
- AI expansion
- Browser matrix / Playwright
- Ownership-transfer redesign
- CRM channel integrations
- Dashboard feed or IAM audit changes
- New npm dependencies
