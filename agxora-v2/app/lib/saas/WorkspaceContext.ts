/**
 * WorkspaceContext — active workspace surface.
 * Backed by OrganizationProvider (no duplicated state).
 */

export {
  useOrganization as useWorkspaceContext,
  useActiveWorkspace,
  useWorkspaceDirectory,
} from "../organization";
