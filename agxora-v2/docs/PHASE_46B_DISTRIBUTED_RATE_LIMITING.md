# Phase 46-B — Distributed Rate Limiting

## Purpose

Second slice of Phase 46. Adds an **optional HTTP shared `RateLimitStore`**
backend so rate limits can be enforced consistently across multiple Node
processes / instances, while preserving Phase 46-A behavior and defaults.

**Memory remains the default.** Existing deployments behave exactly as before
unless `AGXORA_RATE_LIMIT_STORE=http` is explicitly configured.

## Architecture

```
API route handler
  → await rateLimitResponse({ request, policyId, userId? })
       → await enforceRateLimit(...)
            → getRateLimitStore(maxKeys)
                 1. test override (setRateLimitStoreForTests)
                 2. store=http + valid URL → HttpRateLimitStore (fetch)
                 3. default / store=memory → MemoryRateLimitStore
                 4. store=http without URL → fail-closed misconfigured store
            → await store.consume({ key, max, windowMs, now? })
            → allow OR 429 + Retry-After
```

No Redis npm package is added. The HTTP worker may internally use Upstash,
Redis, or any shared counter — AGXORA only implements the HTTP client (same
pattern as Phase 45 email `AGXORA_EMAIL_HTTP_URL`).

## Store selection

| `AGXORA_RATE_LIMIT_STORE` | Behavior |
|---------------------------|----------|
| unset / `memory` | Process-local `MemoryRateLimitStore` (Phase 46-A) |
| `http` + valid URL | Shared store via `fetch` POST |
| `http` + missing URL | **Fail-closed** — no silent memory fallback |

## HTTP worker contract

### Request

```
POST {AGXORA_RATE_LIMIT_HTTP_URL}
Authorization: Bearer {AGXORA_RATE_LIMIT_HTTP_TOKEN}   (optional)
Content-Type: application/json
Accept: application/json
```

Body:

```json
{
  "key": "auth.login:ip:203.0.113.10",
  "max": 20,
  "windowMs": 900000,
  "now": 1734567890123
}
```

- `key` — server-built policy + IP/user scope (never client-supplied)
- `max`, `windowMs` — resolved policy values (including env overrides)
- `now` — optional epoch ms for testability

### Success (HTTP 200)

Allowed:

```json
{
  "allowed": true,
  "remaining": 18,
  "limit": 20,
  "retryAfterSec": 0
}
```

Denied:

```json
{
  "allowed": false,
  "remaining": 0,
  "limit": 20,
  "retryAfterSec": 847
}
```

Invalid JSON or missing/invalid `allowed` → store failure → fail-closed 429.

### Failure handling

Single `fetch` attempt (no retries). Fail-closed for all existing policies:

- Network error
- Timeout (`AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS`, default 2500)
- Non-2xx HTTP status
- Invalid JSON or response shape

Logs: `[agxora.rate-limit] shared store handoff failed` — never logs tokens,
URLs with credentials, or auth request bodies.

## Configuration (server-only)

| Env | Default | Meaning |
|-----|---------|---------|
| `AGXORA_RATE_LIMIT_STORE` | `memory` | `memory` \| `http` |
| `AGXORA_RATE_LIMIT_HTTP_URL` | unset | Shared store endpoint (required when store=`http`) |
| `AGXORA_RATE_LIMIT_HTTP_TOKEN` | unset | Optional bearer token |
| `AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS` | `2500` | Request timeout (ms) |

All Phase 46-A env vars unchanged:

- `AGXORA_RATE_LIMIT_ENABLED`
- `AGXORA_TRUST_PROXY`
- `AGXORA_RATE_LIMIT_MAX_KEYS` (memory store only)
- `AGXORA_RATE_LIMIT_<POLICY>_MAX`
- `AGXORA_RATE_LIMIT_<POLICY>_WINDOW_MS`

## What is unchanged from Phase 46-A

- All 9 policies, limits, windows, key kinds
- 9 protected routes only (no CRM, no GET sweep)
- 429 JSON shape and `Retry-After`
- IP trust rules (`clientIp.ts` untouched)
- `AGXORA_RATE_LIMIT_ENABLED=false` bypass
- `setRateLimitStoreForTests()` highest-priority override

## Module layout

```
app/lib/security/rate-limit/
  types.ts              # RateLimitStore (async consume)
  config.ts             # + getRateLimitStoreConfig()
  memoryStore.ts        # MemoryRateLimitStore (default)
  provider.ts           # store selection + test override
  providers/http.ts     # HttpRateLimitStore
  enforce.ts            # async enforceRateLimit
  http.ts               # async rateLimitResponse
  clientIp.ts           # unchanged
  rate-limit.test.ts    # 46-A regression + 46-B HTTP tests
```

## Tests

`app/lib/security/rate-limit/rate-limit.test.ts` covers:

- Phase 46-A memory regression (async)
- Provider selection and test override precedence
- HTTP allow/deny, Retry-After, Authorization header, payload contract
- HTTP failure modes (500, network, invalid JSON, invalid shape, timeout)
- Misconfigured http store without URL
- No auth password leakage in rate-limit payload
- Route integration unchanged

## Known limitations

- No in-repo reference worker — operators deploy their own HTTP sidecar
- HTTP store adds one RTT per protected request when enabled
- `AGXORA_RATE_LIMIT_MAX_KEYS` applies to memory store only
- No broad API-wide or CRM write rate limiting in this slice

## Explicit out of scope

- Redis / Upstash npm packages
- New rate-limit policies
- CRM route rate limiting
- MFA / OAuth / Stripe / AI
- Monitoring / bot detection / Playwright
- Session token hashing
- OrganizationProvider migration

See also: `docs/PHASE_46_RATE_LIMITING.md` (Phase 46-A baseline).
