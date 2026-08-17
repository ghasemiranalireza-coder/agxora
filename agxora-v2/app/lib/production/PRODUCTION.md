# AGXORA Production Deployment & Operational Excellence

## Architecture decisions

1. **Proxy (not Middleware)** — Next.js 16 `proxy.ts` is a coarse missing-cookie redirect only. It does **not** authenticate.
2. **Server session gate** — `enforcePrivatePageAccess` in dashboard / workspace / onboarding / welcome layouts hashes the cookie and looks up PostgreSQL (`inspectSessionToken`). Same authority as API `requireCurrentActor`.
3. **IAM decisions** — `evaluateAccess` / `IamRouteGuard` classify unauthorized vs expired; they are not a substitute for DB session validation.
4. **Liveness vs readiness** — `GET /api/health` (alive) vs `GET /api/ready` (fail closed).
5. **Observability stubs** — `reportError` / `startTrace` / `registerSentryHook`.

## Security model

| Control | Mechanism |
|---------|-----------|
| Private HTML routes | Node layout: session hash + DB row + not expired + not revoked |
| API routes | `requireCurrentActor()` / hashed `tokenHash` |
| Missing cookie (auth required) | Redirect `/login?next=` |
| Fake / expired / revoked cookie | Redirect `/session-expired` |
| Production auth | Always required (fail closed) |
| Production identity | `getAuthMode()` always `server` |
| Sensitive data | `redactSensitive` for logs |
| Headers | CSP baseline, frame deny, nosniff, referrer, HSTS (prod) |

## Environment separation

| Variable | Development | Production (required) |
|----------|-------------|------------------------|
| `AGXORA_AUTH_REQUIRED` | `false` (optional) | `true` (forced even if false) |
| `NEXT_PUBLIC_AGXORA_AUTH_MODE` | `server` (default); `local` demo only | `server` (forced) |
| `AGXORA_USE_MOCKS` | `true` | `false` |
| `NEXT_PUBLIC_AGXORA_ENV` | `development` | `production` |
| `NEXT_PUBLIC_AGXORA_DATA_PROVIDER` | `local` | `rest` or `remote` |
| `NEXT_PUBLIC_AGXORA_CRM_PERSISTENCE` | `local` | `database` |
| `AGXORA_EMAIL_PROVIDER` | `none` / `console` | `http` |
| `AGXORA_EMAIL_HTTP_URL` | unset | HTTPS worker URL |
| `AGXORA_EMAIL_HTTP_TOKEN` | unset | optional bearer for the worker |
| `AGXORA_EMAIL_FROM` | `noreply@agxora.app` | real from-address |
| `DATABASE_URL` | local Postgres | production Postgres |

Auth mode is **never** inferred from CRM persistence.

Do not commit real `AGXORA_EMAIL_HTTP_TOKEN`, API keys, or database passwords.

## Monitoring

- Liveness: `GET /api/health` — HTTP 200 if the process is up
- Readiness: `GET /api/ready` — HTTP 503 when production invariants or the database fail
- Platform logs: `logPlatform` / `listPlatformLogs`

## Maintenance guide

1. `npm run type-check && npm run lint && npm run build && npm test`
2. `npm run start` then `curl -sf localhost:3000/api/health` and `curl -sf localhost:3000/api/ready`
3. Keep shell UX untouched (layout, sidebar, header, hero, globe, theme, nav)
4. Register real Sentry via `registerSentryHook` in `instrumentation.ts`
