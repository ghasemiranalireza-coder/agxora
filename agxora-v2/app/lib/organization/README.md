/**
 * # AGXORA Universal Organization Foundation
 *
 * Phase 3 architecture layer. **No UI.** This package is the shared core
 * every future module (CRM, Projects, Documents, Automation, Analytics,
 * Finance, AI, Workflows, Knowledge, Marketplace, Integrations) will use.
 *
 * ## Design principles
 *
 * - **Universal** — not laundry, hospitality, CRM, or any vertical.
 * - **Multi-tenant ready** — isolation keys + membership model.
 * - **Multi-workspace ready** — one user → many workspaces (UI later).
 * - **API-ready** — domain service depends on `OrganizationApiPort`.
 * - **AI-ready** — `OrganizationAiContext` for future agents (no agents yet).
 * - **Strict TypeScript** — branded IDs, validated profiles, pure validators.
 *
 * ## Module map
 *
 * | Path | Responsibility |
 * |---|---|
 * | `types.ts` | Domain contracts |
 * | `constants.ts` | Enums, defaults, slug helpers |
 * | `validation.ts` | Pure profile/draft validation |
 * | `organizationStore.ts` | External store (no React required) |
 * | `organizationService.ts` | Domain orchestration |
 * | `api/` | Port + local in-memory adapter |
 * | `OrganizationProvider.tsx` | React context boundary |
 * | `useOrganization.ts` | Public hooks |
 *
 * ## Usage
 *
 * ```tsx
 * import { useOrganization } from "@/app/lib/organization";
 *
 * function Example() {
 *   const { organization, workspace, createOrganization } = useOrganization();
 *   // ...
 * }
 * ```
 *
 * ## Swapping the backend later
 *
 * 1. Implement `OrganizationApiPort` against your API.
 * 2. Pass `new OrganizationService({ api: remoteApi })` into
 *    `<OrganizationProvider service={...}>`.
 * 3. No dashboard or module rewrites required.
 *
 * ## Explicit non-goals (Phase 3)
 *
 * - No CRM / Finance / HR / Sales / Marketing modules
 * - No AI agents
 * - No multi-workspace UI
 * - No visual / dashboard changes
 */
