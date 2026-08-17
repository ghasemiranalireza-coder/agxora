# Phase 44 — Organization & Workspace Control Plane

## Architecture

Phase 44 adds a **server-authoritative** organization / workspace / membership /
invitation control plane on top of Phase 42.1 tenancy and Phase 43 sessions.

```
httpOnly session cookie
  → getCurrentActor() / requireActorForWorkspace(id)
  → session → user → ACTIVE membership → workspace/org + role
  → assertControl / assertCanGrantRole / assertCanManageTarget
  → Prisma transaction
  → compact ControlPlaneAuditEvent
```

Client-supplied `organizationId`, `workspaceId`, `membershipId`, `role`, and
`ownerId` are never authority. A requested workspace ID is a **hint**; membership
is the authority.

This phase does **not** implement Stripe, AI agents, autonomous outreach, or
email delivery. Invitation links are created and must be shared directly because
mail is not configured.

## Schema changes

Migration: `prisma/migrations/20260813120000_phase44_control_plane`

| Change | Purpose |
|--------|---------|
| `Workspace.archivedAt` | Soft archive; archived workspaces cannot be switched into |
| `Invitation` | Hashed invite tokens, expiry, accept/revoke timestamps |
| `ControlPlaneAuditEvent` | Compact membership/workspace audit (no secrets) |

Constraints / indexes:

- `Membership` unique `(userId, workspaceId)` (existing)
- `Invitation.tokenHash` unique
- `Invitation` index `(workspaceId, invitedEmail)`
- `ControlPlaneAuditEvent` indexes by org/workspace/actor + `createdAt`

Pending-invitation uniqueness is enforced in the service (expired rows may be
replaced). A partial unique index was not added because expired-but-unrevoked
rows would block a legitimate re-invite.

Seed remains idempotent and does not create invitations.

## Authorization matrix

Central policy: `app/lib/tenancy/authorize.ts` (`CONTROL_PERMISSIONS`).

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| organization.read | yes | yes | yes |
| organization.update (name) | yes | yes | no |
| organization slug | yes | no | no |
| workspace.read / switch | yes | yes | yes |
| workspace.update (rename) | yes | yes | no |
| workspace.create / archive | yes | no | no |
| member.read | yes | yes | yes |
| member.invite | ADMIN/MEMBER only | MEMBER only | no |
| member.role.change / remove | ADMIN/MEMBER, never OWNER, never self | MEMBER only | no |
| invitation.read / revoke | yes | MEMBER invites only | no |

There is always exactly one workspace OWNER. **Ownership transfer is not
implemented.** OWNER cannot delete themselves. Inviting `OWNER` is always
rejected.

Creating a workspace makes the creator OWNER of **that** workspace (still inside
the current organization).

## Invitation lifecycle

1. OWNER or authorized ADMIN creates an invitation (`role` cannot be at/above
   inviter rank; never OWNER).
2. Server generates a cryptographically random raw token, stores **only**
   SHA-256 `tokenHash`, TTL **7 days**.
3. API returns the raw token **once** plus `acceptPath` and
   `delivery: "not_configured"`. The UI tells the operator to share the link.
4. `GET /invite/[token]` / `GET /api/v1/invitations/[token]` previews without
   leaking the hash. Unauthenticated users are sent to login/register with
   `?next=/invite/...`.
5. `POST /api/v1/invitations/[token]/accept` requires a session whose email
   matches `invitedEmail` (normalized). Wrong email is 403 — the invite is not
   attached to a different account.
6. Acceptance is transactional: create/reactivate membership, set `acceptedAt`,
   optionally switch the session workspace, write `invitation_accepted`.
7. Expired, revoked, or already-accepted tokens fail safely. Replay fails.

## API routes

| Method | Path | Notes |
|--------|------|-------|
| GET/PATCH | `/api/v1/organizations/current` | Current org from session |
| GET/POST | `/api/v1/workspaces` | List / create (create = OWNER) |
| GET/PATCH | `/api/v1/workspaces/[id]` | Membership required |
| POST | `/api/v1/workspaces/[id]/archive` | OWNER; not last active workspace |
| POST | `/api/v1/workspaces/[id]/switch` | Membership + not archived |
| GET | `/api/v1/workspaces/[id]/members` | Active members |
| PATCH/DELETE | `/api/v1/workspaces/[id]/members/[userId]` | Role change / revoke membership |
| GET/POST | `/api/v1/workspaces/[id]/invitations` | List / create (raw token once) |
| POST | `/api/v1/workspaces/[id]/invitations/[invitationId]/revoke` | |
| GET | `/api/v1/invitations/[token]` | Public preview |
| POST | `/api/v1/invitations/[token]/accept` | Authenticated, email match |
| GET | `/api/v1/workspaces/[id]/activity` | Last 20 control-plane events |

Errors: 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict,
422 validation. Prisma/SQL, token hashes, and stack traces are not returned.

Unknown body fields (`organizationId`, `invitedBy`, `acceptedAt`, …) are
ignored. Authority always comes from the session actor.

## Security model

- Session cookie `agxora.server.session` (Phase 43) is the only production
  identity. LocalAuth is not used.
- Workspace switch verifies ACTIVE membership and `archivedAt IS NULL`.
- Cross-tenant workspace/invitation IDs resolve to 403/404, never data.
- Forged `role: "OWNER"` is rejected (`assertCanGrantRole`).
- Raw invitation tokens are never stored or logged.
- Audit metadata stores email/role/field names only.

## Tests

- `app/lib/control-plane/control-plane.test.ts` — Phase 44 authz, invitations,
  tenancy, forged IDs/roles, token hashing, expiry/revoke/replay, wrong-email.
- Existing Phase 42.1 CRM tests and Phase 43 auth tests must still pass.
- Unauthenticated `GET /api/v1/organizations/current` and
  `GET /api/v1/workspaces` return 401.

## Known limitations

- Ownership transfer is implemented in **Phase 45-B** (two-step controlled
  flow). Direct OWNER invite / role change remains forbidden.
- `/dashboard/team` remains a legacy demo module; **Settings → Team** is the
  production membership UI.
- No MFA, OAuth, rate limiting, or Stripe (later phases).
- Organization deletion is not offered.

Session tokens are stored as SHA-256 hashes at rest (Phase 44.3). See
`docs/PHASE_44_3_SESSION_TOKEN_HASHING.md`.

## Future ownership transfer

Implemented in Phase 45-B — see `docs/PHASE_45B_OWNERSHIP_TRANSFER.md`.

## Future email delivery

When a mail provider exists, `createInvitation` should enqueue delivery of the
one-time link and stop returning the raw token in production JSON. The current
`delivery: "not_configured"` contract must remain honest until then.

## Product boundary

Phase 44 only builds the multi-tenant control plane. AGXORA cannot autonomously
acquire customers, answer Instagram/email, or generate/send invoices from this
work.
