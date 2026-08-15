# Phase 45 — Email Delivery

## Purpose

Phase 45 adds a **server-only email delivery architecture** for:

- organization / workspace **invitation** emails
- **password reset** emails
- **email verification** emails

It preserves the existing honesty contract:

```ts
delivery: "not_configured" | "queued"
```

`queued` is returned **only** after a provider successfully accepts/hands off a
message. Failed handoffs never claim success.

## Scope

In scope:

- Provider abstraction (`app/lib/email`)
- Wiring invitation, password-reset, and verification token flows
- Environment configuration
- Security constraints (server-only credentials, no raw-token logging)
- Tests + documentation

Out of scope:

- **Controlled ownership transfer** is Phase **45-B** (see
  `docs/PHASE_45B_OWNERSHIP_TRANSFER.md`). This document covers email delivery only.
- Stripe / billing
- Social login
- AI expansion
- Phase 46 rate limiting
- Prisma upgrades / schema changes for mail storage
- Rewriting the legacy SaaS mock `features/saas/email` localStorage queue

## Architecture

```
Auth / Control-plane service
  → build*Email() templates (include one-time action URL)
  → deliverEmail(message)
       → getEmailProvider()  // none | console | http | memory
       → provider.send(message)
       → delivery: "queued" | "not_configured"
```

Existing token generation and hashed storage are unchanged:

- Invitations: `createOpaqueToken` + `tokenHash` (Phase 44)
- Password reset / verification: hashed tokens in Prisma (Phase 43)

## Provider abstraction

| Provider | Env | Behavior |
|----------|-----|----------|
| `none` | `AGXORA_EMAIL_PROVIDER=none` (default) | Not configured; no handoff |
| `console` | `console` | Dev handoff; logs kind/to/subject with redacted URLs |
| `http` | `http` + `AGXORA_EMAIL_HTTP_URL` | POST JSON to a mail worker via `fetch` |
| `memory` | `memory` | Vitest outbox only |

HTTP payload:

```json
{
  "from": "...",
  "to": "...",
  "subject": "...",
  "text": "...",
  "kind": "invitation|password_reset|email_verification",
  "actionUrl": "..."
}
```

No ESP SDK dependencies were added. Production SMTP/ESP integration belongs in
the HTTP worker behind `AGXORA_EMAIL_HTTP_URL`.

## Invitation delivery

`createInvitation` still creates the hashed invitation row, then calls
`deliverEmail(buildInvitationEmail(...))`.

API `POST /api/v1/workspaces/[id]/invitations`:

- `delivery: "not_configured"` → returns `token` + `acceptPath` so operators can
  share the link manually (unchanged honesty).
- `delivery: "queued"` → **does not** return the raw token in JSON (email owns
  delivery of the one-time link).

Acceptance / preview / revoke flows are unchanged.

## Password-reset delivery

`requestPasswordReset` creates the hashed reset token, then attempts delivery.

- Missing account: `{ ok: true, delivery: "not_configured" }` (no handoff).
- Existing account + successful handoff: `delivery: "queued"`.
- Existing account + failed/unconfigured handoff: `delivery: "not_configured"`.
- `AGXORA_AUTH_EXPOSE_RESET_TOKEN=1` still exposes `resetToken` for local tests.

Legacy `AGXORA_AUTH_EMAIL_DELIVERY=configured` alone **no longer** claims
`queued` without a real provider handoff.

## Verification delivery

`createEmailVerificationToken` creates the hashed verification token, then
attempts delivery.

New route: `POST /api/v1/auth/request-verification` (requires current actor).

`ServerAuthAdapter.requestEmailVerification` calls that route. Raw tokens are
returned only when `AGXORA_AUTH_EXPOSE_RESET_TOKEN=1`.

## Configuration

Server-only (never `NEXT_PUBLIC_*` for secrets):

```bash
AGXORA_EMAIL_PROVIDER=none|console|http|memory
AGXORA_EMAIL_FROM=noreply@agxora.app
AGXORA_EMAIL_HTTP_URL=
AGXORA_EMAIL_HTTP_TOKEN=
# Optional link origin override (else NEXT_PUBLIC_AGXORA_SITE_URL)
AGXORA_APP_ORIGIN=http://localhost:3000
```

## Delivery states

| State | Meaning |
|-------|---------|
| `not_configured` | No provider, or handoff failed |
| `queued` | Provider accepted the message |

## Failure behavior

- Handoff errors are logged **without** raw tokens / full action URLs.
- API responses never claim `queued` on failure.
- Invitation rows remain created even if email handoff fails (operator can
  re-share when `not_configured` returns a token).

## Security considerations

- Provider credentials are server-only env vars.
- Raw tokens are never logged by the delivery layer.
- Invitation / reset / verify tokens remain hashed at rest.
- Authorization / tenancy policies are unchanged.
- Clients never receive provider credentials or HTTP worker tokens.
- When invite email is queued, the raw invite token is omitted from the API body.

## Testing / verification

- `app/lib/email/email.delivery.test.ts` — not_configured / queued / failed handoff
- Existing Phase 43 auth + Phase 44 control-plane suites must still pass
- `npm run build`

## Explicit non-goal

Controlled ownership transfer is NOT part of this Phase 45 email-delivery
implementation and will be handled as the next controlled task.
