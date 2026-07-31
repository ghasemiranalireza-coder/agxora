# AGXORA Production Deployment & Operational Excellence

## Architecture decisions

1. **Proxy (not Middleware)** — Next.js 16 uses `proxy.ts` for edge/network routing. Behavior matches the former soft/hard auth gate.
2. **Shared route catalog** — `app/lib/production/routes.ts` is the single source for public/private/admin classification (proxy + IAM).
3. **Security headers** — applied in `next.config.ts` via `productionOnlyHeaders()`.
4. **Observability stubs** — `reportError` / `startTrace` / `registerSentryHook` ready for Sentry or OpenTelemetry.
5. **Health endpoint** — `GET /api/health` for liveness and config warnings (no secrets).

## Security model

| Control | Mechanism |
|---------|-----------|
| Route guards | `proxy.ts` + IAM `classifyIamRoute` |
| Session validation | Cookie presence + `validateSessionToken` placeholder |
| Hard auth | `AGXORA_AUTH_REQUIRED=true` |
| Workspace isolation | Feature stores / services assert org id |
| Sensitive data | `redactSensitive` for logs |
| Headers | CSP baseline, frame deny, nosniff, referrer, HSTS (prod) |
| API auth placeholder | `authorizeApiRequestPlaceholder` |

## Environment separation

| Variable | Development | Production |
|----------|-------------|------------|
| `AGXORA_AUTH_REQUIRED` | `false` | `true` |
| `AGXORA_USE_MOCKS` | `true` | `false` |
| `NEXT_PUBLIC_AGXORA_ENV` | `development` | `production` |
| `NEXT_PUBLIC_AGXORA_DATA_PROVIDER` | `local` | `rest` / remote |

See `.env.example`.

## Monitoring

- Platform logs: `logPlatform` / `listPlatformLogs`
- Performance: `trackPerformance` / `startTrace`
- Errors: `reportError` (+ optional Sentry hook)
- Health: `/api/health`

## Accessibility

Helpers in `app/lib/production/a11y.ts` (`focusElement`, `isActivationKey`, `announceToLiveRegion`) support keyboard and ARIA live-region patterns without changing shell UX.

## Maintenance guide

1. `npm run type-check && npm run lint && npm run build`
2. `npm run start` then `curl -s localhost:3000/api/health`
3. Keep shell UX untouched (layout, sidebar, header, hero, globe, theme, nav)
4. Prefer repository/provider patterns when replacing stubs
5. Register real Sentry via `registerSentryHook` in `instrumentation.ts`

## Testability

`createMockClock` / `createMockFetch` support unit and integration tests without UI coupling.
