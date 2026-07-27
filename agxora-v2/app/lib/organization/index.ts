/**
 * AGXORA Universal Organization Foundation
 *
 * Public barrel — import from `@/app/lib/organization` (or relative path).
 */

export type {
  OrganizationId,
  WorkspaceId,
  UserId,
  MembershipId,
  OrganizationType,
  OrganizationSize,
  IndustryCategory,
  BrandColors,
  AiPreferences,
  OrganizationProfile,
  Organization,
  WorkspaceStatus,
  WorkspaceSettings,
  WorkspaceModuleKey,
  Workspace,
  MembershipRole,
  MembershipStatus,
  WorkspaceMembership,
  OrganizationAiContext,
  OrganizationDraft,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateWorkspaceInput,
  OrganizationSession,
} from "./types";

export {
  asOrganizationId,
  asWorkspaceId,
  asUserId,
  asMembershipId,
  DEFAULT_AI_PREFERENCES,
} from "./types";

export {
  ORGANIZATION_STORAGE_KEY,
  ORGANIZATION_SESSION_STORAGE_KEY,
  ORGANIZATION_TYPES,
  ORGANIZATION_SIZES,
  INDUSTRY_CATEGORIES,
  WORKSPACE_MODULE_REGISTRY,
  createEmptyOrganizationProfile,
  slugifyWorkspaceName,
} from "./constants";

export type {
  ValidationIssue,
  ValidationIssueCode,
  ValidationResult,
} from "./validation";

export {
  validateOrganizationProfile,
  validateOrganizationDraft,
  assertValidCreateInput,
} from "./validation";

export type { OrganizationApiPort } from "./api/types";
export {
  OrganizationApiNotConfiguredError,
} from "./api/types";
export {
  createLocalOrganizationApi,
  localOrganizationApi,
} from "./api/organizationApi";

export {
  OrganizationService,
  OrganizationValidationError,
  organizationService,
} from "./organizationService";

export {
  getOrganizationSession,
  getOrganizationAiContext,
  setOrganizationSession,
  subscribeOrganizationStore,
  resetOrganizationStore,
  selectWorkspaceInStore,
} from "./organizationStore";

export {
  OrganizationProvider,
  useOrganizationContext,
} from "./OrganizationProvider";

export {
  useOrganization,
  useActiveOrganization,
  useActiveWorkspace,
  useOrganizationAiContext,
  useWorkspaceDirectory,
} from "./useOrganization";

export {
  buildOrganizationAiContext,
  summarizeOrganizationForAi,
} from "./ai/organizationAiContext";
