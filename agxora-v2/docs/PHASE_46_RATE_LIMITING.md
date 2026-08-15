# Phase 46-A — Server-Side Rate Limiting & Basic Abuse Controls

## Purpose

First slice of Phase 46. Protects **sensitive authentication and control-plane
mutation endpoints** from brute-force and abuse using a small server-only
rate-limit abstraction.

This is **not** a full Phase 46 delivery (monitoring, browser QA, MFA, etc.).

## Architecture

```
API route handler
  → rateLimitResponse({ request, policyId, userId? })
       → resolveClientIpKey(request)   // trust-proxy gated
       → build bucket key (ip | user | ip_user)
       → MemoryRateLimitStore.consume()
       → allow OR 429 + Retry-After
  → existing auth / control-plane logic unchanged
```

Integration is **per-route** (explicit), not a global middleware sweep.
`proxy.ts` remains an auth soft-gate only and does not rate-limit APIs.

## Implemented

| Policy id | Default | Window | Key |
|-----------|---------|--------|-----|
| `auth.login` | 20 | 15 min | IP |
| `auth.register` | 10 | 1 hour | IP |
| `auth.forgot_password` | 5 | 1 hour | IP |
| `auth.reset_password` | 10 | 1 hour | IP |
| `auth.verify_email` | 20 | 1 hour | IP |
| `auth.request_verification` | 5 | 1 hour | user |
| `control.invite` | 30 | 1 hour | user |
| `control.ownership_transfer_initiate` | 5 | 1 hour | user |
| `control.ownership_transfer_confirm` | 10 | 1 hour | IP + user |

Protected routes:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/request-verification`
- `POST /api/v1/workspaces/[id]/invitations`
- `POST /api/v1/organizations/current/ownership-transfer`
- `POST /api/v1/ownership-transfers/[token]/confirm`

Normal dashboard reads (org GET, workspace list, `/auth/me`, etc.) are **not**
rate-limited by this slice.

## Response behavior

- HTTP **429**
- Body: `{ ok: false, code: "rate_limited", message: "Too many requests. Try again later." }`
- Header: `Retry-After` (seconds)
- No account/resource existence hints
- No limiter internals in the JSON body

## Configuration (server-only)

| Env | Default | Meaning |
|-----|---------|---------|
| `AGXORA_RATE_LIMIT_ENABLED` | `true` | Master switch |
| `AGXORA_TRUST_PROXY` | `false` | Trust `X-Forwarded-For` / `X-Real-IP` |
| `AGXORA_RATE_LIMIT_MAX_KEYS` | `10000` | In-memory key cap |
| `AGXORA_RATE_LIMIT_<POLICY>_MAX` | policy default | Override max (e.g. `AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX`) |
| `AGXORA_RATE_LIMIT_<POLICY>_WINDOW_MS` | policy default | Override window |

Policy env names use upper-snake of the id with `.` → `_`
(e.g. `auth.login` → `AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX`).

**Production:** set `AGXORA_TRUST_PROXY=true` behind a reverse proxy that
overwrites forwarded headers. Without trust, all unauthenticated callers share
the `untrusted` IP key (spoof-safe, coarse).

## Storage / deployment

**Implemented store:** process-local in-memory sliding window.

### Known deployment limitation

In-memory counters are **not shared across Node processes / instances**.
Horizontal scale does **not** provide a global limit. This slice documents that
limitation instead of claiming Redis-level consistency.

No Redis / Upstash dependency was added (none exists in the repo today).

### Failure behavior

Sensitive policies use **fail-closed**:

- Store capacity exceeded → treat as rate limited (429)
- Does **not** fail open into an authentication bypass

## Security notes

- Client IP headers ignored unless `AGXORA_TRUST_PROXY=true`
- No trust of client identity headers (`x-user-id`, etc.)
- Unauthenticated endpoints keyed by IP (never user id alone)
- Authenticated mutations keyed by user (and IP+user for transfer confirm)
- Key map is capped to reduce unbounded memory growth
- Generic 429 messages preserve anti-enumeration for forgot-password / login

## Deferred (not in 46-A)

- Distributed / Redis shared limiter
- Broad API-wide rate limiting
- Advanced abuse scoring / bot detection
- Monitoring / alerting infrastructure beyond structured 429 responses
- Browser matrix QA
- MFA / OAuth
- Stripe / billing
- AI expansion
- Ownership-transfer redesign (multi-workspace OWNER)

## Tests

`app/lib/security/rate-limit/rate-limit.test.ts`

## Explicit non-goals

Do not confuse this with `app/lib/ai/AIRateLimiter.ts` (AI provider throttle only).
Phase 45 email delivery and Phase 45-B ownership-transfer **business logic**
are unchanged — only HTTP entrypoints gained rate-limit guards.
