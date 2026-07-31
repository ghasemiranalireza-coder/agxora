# AGXORA Enterprise Backend Foundation & Data Platform — Phase 23

## Mission

Transform AGXORA from a LocalStorage-first frontend into a provider-independent enterprise data platform — **without redesigning the UI shell or breaking existing modules**.

## Folder structure

```
app/lib/backend/                 # Core infrastructure
  api/                           # ApiClient (GET/POST/PUT/PATCH/DELETE, retry, interceptors)
  providers/data/                # Local / REST / GraphQL / Database / Mock providers
  repositories/                  # Generic CRUD + domain façades (CRM, Projects, …)
  mock/                          # Mock server emulating REST
  utils/cache.ts                 # TTL cache + queryFetch (React Query–ready)
  config/                        # Env + feature flags
  security/                      # JWT/secure storage / CSRF placeholders
  observability/                 # Logging, metrics, analytics hooks
  errors/                        # Normalized friendly errors
  loading/                       # Global loading + optimistic + background refresh
  state/slices.ts                # Server / UI / temporary state separation

features/data-platform/          # Public façade for feature modules
  index.ts
  ARCHITECTURE.md
```

## Provider pattern

| Provider | Status | Role |
|----------|--------|------|
| `LocalDataProvider` | Active | Maps logical paths → LocalStorage-backed handlers |
| `RestDataProvider` | Ready | Delegates to `ApiClient` + `NEXT_PUBLIC_AGXORA_API_BASE_URL` |
| `GraphQLDataProvider` | Placeholder | 501 until Apollo/urql wired |
| `FutureDatabaseProvider` | Placeholder | ORM/SQL plug-in point |
| `MockDataProvider` | Active | Deterministic mock server for tests/demos |

Switch via `NEXT_PUBLIC_AGXORA_DATA_PROVIDER` or `setActiveDataProvider(id)`.

## Repository pattern

Domain repositories (`crmDataRepository`, `projectsDataRepository`, `financeDataRepository`, `documentsDataRepository`, `aiDataRepository`, `identityDataRepository`) call the **active DataProvider** — never LocalStorage or `fetch` from UI.

Existing CRM / Projects modules keep their current stores for compatibility. Local handlers bridge those stores into the provider layer so new code can migrate incrementally.

## API client

- Methods: `get` / `post` / `put` / `patch` / `delete` / `request` / `requestOrThrow`
- Timeout + linear retry (429 / 5xx)
- Bearer auth via `configureApiClient(() => token)`
- Request/response interceptors
- CSRF header when feature flag `security.csrf` is enabled

## Cache

`queryFetch(key, fetcher, { ttlMs, tags, staleWhileRevalidate })`  
Invalidate with `cacheInvalidate` / `cacheInvalidateByTag(CacheTags.crm)`.

Drop-in precursor for React Query / TanStack Query.

## State separation

| Store | Purpose |
|-------|---------|
| `serverStateStore` | Hydration, sync clock, online flag |
| `uiStateStore` | Modals, palette, chrome prefs |
| `temporaryStateStore` | Drafts, flash messages |

Server data lives in repositories + query cache — not duplicated in UI stores.

## Security

- `readTokenBundle` / `writeTokenBundle` — JWT + refresh abstraction
- `SecureStorageAdapter` — LocalStorage today; httpOnly/WebCrypto later
- CSRF token hook on `ApiClient`
- Encryption stubs (`encryptPayload` / `decryptPayload`)

## Observability

`logPlatformEvent`, `markPerformance`, `trackAnalytics`, `getPlatformMetrics`.

## Loading

`withGlobalLoading`, `runAsyncState`, `beginOptimistic`, `scheduleBackgroundRefresh` + existing skeleton/toast hosts.

## Migration strategy

1. **Now** — New code imports from `@/features/data-platform` or domain repositories.
2. **Next** — Wrap remaining Finance/Documents UI behind repositories (replace static imports).
3. **Backend** — Point `NEXT_PUBLIC_AGXORA_DATA_PROVIDER=rest` and `NEXT_PUBLIC_AGXORA_API_BASE_URL` at a real API; Local handlers become unused.
4. **UI** — No shell changes required; module pages swap data hooks only.

## Compatibility

- Dashboard Layout, Sidebar, Header, Hero, Globe, Theme, Navigation unchanged.
- CRM, Projects, Finance, Documents, AI, Identity modules continue with existing stores.
- `DataPlatformBridge` boots inside `AppProviders` without visual changes.

## Environment

```bash
NEXT_PUBLIC_AGXORA_API_BASE_URL=/api
NEXT_PUBLIC_AGXORA_DATA_PROVIDER=local   # local | rest | mock | graphql | database
AGXORA_USE_MOCKS=true
AGXORA_REQUEST_TIMEOUT_MS=15000
AGXORA_RETRY_ATTEMPTS=2
AGXORA_AUTH_REQUIRED=false
```

## Extension points

- `registerDataProvider(provider)`
- `localDataProvider.register(path, handler)`
- `mockServer.register(method, path, handler)`
- `ApiClient.useRequestInterceptor` / `useResponseInterceptor`
- `setSecureStorageAdapter(adapter)`
- Domain repository methods behind `domainRepositories.*`
