# Phase 45-B — Controlled Ownership Transfer

## Purpose

Phase 45-B adds a **two-step, audited ownership transfer** for organizations on
top of the Phase 44 control plane and Phase 45-A email delivery.

Ownership is **never** granted through invitation or role-change APIs.
`assertCanGrantRole` continues to reject `role: "OWNER"`.

## Flow

### Step 1 — Initiate

1. Current organization OWNER (workspace role OWNER **and**
   `Organization.ownerId`) selects an **active** member of the current workspace.
2. Server creates an `OwnershipTransfer` row with:
   - `fromUserId` / `toUserId`
   - `tokenHash` only (SHA-256 of a high-entropy raw token)
   - `expiresAt` (48 hours)
3. Roles and `Organization.ownerId` are **unchanged** while pending.
4. Audit: `ownership_transfer_initiated`.
5. Email uses Phase 45-A `buildOwnershipTransferEmail` + `deliverEmail`
   (`delivery: "not_configured" | "queued"`). Raw token is returned in the API
   **only** when delivery is `not_configured` (same honesty as invitations).

### Step 2 — Confirm

1. Recipient authenticates as `toUserId` and posts the confirmation token.
2. Transaction validates expiry, cancellation, replay, org owner still
   `fromUserId`, and both memberships still ACTIVE.
3. Atomically:
   - `Organization.ownerId` → target
   - Previous OWNER membership → `ADMIN`
   - Target membership → `OWNER`
   - `confirmedAt` set
4. Audit: `ownership_transfer_completed`.
5. Replay / expired / unauthorized confirmations fail safely (audit
   `ownership_transfer_failed` when applicable).

Cancel: initiating owner may cancel a pending transfer
(`ownership_transfer_cancelled`).

## Eligibility rules

- Initiator: OWNER of the active workspace **and** organization owner
- Target: ACTIVE membership in that workspace; not OWNER; not self
- External / cross-tenant users are rejected
- Non-owners cannot initiate or cancel

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/organizations/current/ownership-transfer` | Pending transfer or `null` |
| POST | `/api/v1/organizations/current/ownership-transfer` | Initiate (`targetUserId`) |
| DELETE | `/api/v1/organizations/current/ownership-transfer` | Cancel pending |
| GET | `/api/v1/ownership-transfers/[token]` | Public preview (no hash) |
| POST | `/api/v1/ownership-transfers/[token]/confirm` | Target confirms |

UI: Settings → Team (initiate / cancel) and `/ownership-transfer/[token]`.

## Security

- Raw confirmation tokens are never persisted or written to audit metadata
- When email is queued, the API omits the raw token from JSON
- Existing session / tenancy / OWNER grant bans remain intact
- No second email system — Phase 45-A facade only

## Schema

Migration: `prisma/migrations/20260815110000_phase45b_ownership_transfer`

Model: `OwnershipTransfer` (`ownership_transfers`)

## Out of scope

- Stripe / billing
- Social features
- AI
- Phase 46 rate limiting
- MFA / OAuth
- Transferring OWNER role on every workspace in the org (only the workspace
  where the transfer was initiated, plus `Organization.ownerId`)
