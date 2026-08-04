# AGXORA Enterprise IAM — Phase 22

## Architecture

Feature module at `features/auth/` consolidates authentication, session lifecycle, organizations/workspaces, team operations, RBAC, route guards, profile, security placeholders, and audit logging — without changing the dashboard shell or existing CRM/Projects/Finance/AI/Documents modules.

```
features/auth/
  components/   # Profile, Identity settings, guards, workspace selector, access pages
  hooks/        # useIamAuth, audit/session/profile selectors
  services/     # iamAuthService, iamTeamService façades
  providers/    # Re-exports AuthProvider / adapters
  guards/       # Public/private/admin catalog + permission matrix
  store/        # Session manager, audit log, profile preferences
  types/        # Public IAM contracts
  utils/        # IDs, formatting
  validation/   # Email/password/slug validators
```

Existing engines remain the source of truth for adapters:
- `app/lib/auth` — AuthProviderPort + LocalAuthAdapter
- `app/lib/identity` — identity API / sessions directory
- `app/lib/organization` — multi-org / multi-workspace model
- `app/lib/saas/TeamService` — invites, roles, ownership transfer
- `app/lib/rbac` — generic RBAC engine (Business OS)

## Authentication pages

| Route | Purpose |
|-------|---------|
| `/login` | Sign in (mock) |
| `/register` | Create account |
| `/demo` | Book demo (placeholder) |
| `/welcome` | First-login welcome |
| `/forgot-password` | Reset request |
| `/reset-password` | Apply reset token |
| `/verify-email` | Email verification |
| `/logout` | End session |
| `/unauthorized` | Sign-in required |
| `/forbidden` | Role denied |
| `/session-expired` | Access token expired |
| `/account-locked` | Lockout placeholder |
| `/dashboard/profile` | User profile |
| `/dashboard/identity` | IAM settings |

## Session management

`iamSessionManager` prepares:
- Access token + refresh token pair (`IamTokenPair`)
- Auto-refresh near expiry
- Persistent login policy
- Logout / absolute timeout
- Idle detection placeholder (`idleTimeoutMs`, disabled by default)

## RBAC

Default roles: **Owner · Admin · Manager · Member · Viewer**  
Central matrix: `IAM_PERMISSIONS` / `IAM_ROLES` / `buildPermissionMatrix()`  
Legacy `employee` → `member`, `guest` → `viewer`.

## Backend integration points

1. Replace `LocalAuthAdapter` with Clerk/Auth0/Supabase implementing `AuthProviderPort`
2. Move session cookies to httpOnly server-set cookies; keep `AUTH_SESSION_COOKIE` name or map in middleware
3. Persist organizations/workspaces via `OrganizationApiPort`
4. Persist audit via `iamAuditStore` writer → SIEM / database
5. Enforce `evaluateAccess` / `IamRouteGuard` in layouts when `AGXORA_AUTH_REQUIRED=true`
6. Wire real email for verification / invites / password reset
7. Enable idle detection and lockout counters on the identity API

## Compatibility

Dashboard layout, sidebar, header, hero, globe, theme, and existing module pages are unchanged. Team management continues at `/dashboard/team`.
