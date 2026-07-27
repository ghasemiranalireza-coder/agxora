"use client";

/**
 * OrganizationProvider — React boundary for the Universal Organization Foundation.
 *
 * Hydrates session state from OrganizationService on mount.
 * Does not render any UI chrome; safe to wrap the entire app.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type ReactNode,
} from "react";
import {
  ORGANIZATION_SESSION_STORAGE_KEY,
} from "./constants";
import {
  organizationService,
  OrganizationValidationError,
  type OrganizationService,
} from "./organizationService";
import {
  getOrganizationAiContext,
  getOrganizationSession,
  patchOrganizationSession,
  resetOrganizationStore,
  selectWorkspaceInStore,
  setOrganizationAiContext,
  setOrganizationSession,
  subscribeOrganizationStore,
} from "./organizationStore";
import type {
  CreateOrganizationInput,
  CreateWorkspaceInput,
  Organization,
  OrganizationAiContext,
  OrganizationDraft,
  OrganizationProfile,
  OrganizationSession,
  UpdateOrganizationInput,
  Workspace,
  WorkspaceId,
} from "./types";
import type { ValidationResult } from "./validation";

export interface OrganizationContextValue {
  readonly session: OrganizationSession;
  readonly organization: Organization | null;
  readonly workspace: Workspace | null;
  readonly aiContext: OrganizationAiContext | null;
  readonly isReady: boolean;
  readonly isLoading: boolean;
  readonly createDraft: (partial?: OrganizationDraft) => OrganizationProfile;
  readonly validateDraft: (draft: OrganizationDraft) => ValidationResult;
  readonly validateProfile: (profile: OrganizationProfile) => ValidationResult;
  readonly createOrganization: (
    input: CreateOrganizationInput,
  ) => Promise<{ organization: Organization; workspace: Workspace }>;
  readonly updateOrganization: (
    input: UpdateOrganizationInput,
  ) => Promise<Organization>;
  readonly createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  /** Architecture-ready; no UI switcher in Phase 3. */
  readonly switchWorkspace: (workspaceId: WorkspaceId) => Promise<boolean>;
  readonly refreshSession: () => Promise<void>;
  readonly buildAiContext: () => OrganizationAiContext | null;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);

function readPreferredWorkspaceId(): WorkspaceId | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(ORGANIZATION_SESSION_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { workspaceId?: string };
    return parsed.workspaceId as WorkspaceId | undefined;
  } catch {
    return undefined;
  }
}

function persistPreferredWorkspaceId(workspaceId: WorkspaceId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!workspaceId) {
      window.localStorage.removeItem(ORGANIZATION_SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      ORGANIZATION_SESSION_STORAGE_KEY,
      JSON.stringify({ workspaceId }),
    );
  } catch {
    // Ignore quota / private mode.
  }
}

interface OrganizationProviderProps {
  readonly children: ReactNode;
  /** Optional DI for tests / alternate backends. */
  readonly service?: OrganizationService;
}

export function OrganizationProvider({
  children,
  service = organizationService,
}: OrganizationProviderProps): JSX.Element {
  const serviceRef = useRef(service);

  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  const session = useSyncExternalStore(
    subscribeOrganizationStore,
    getOrganizationSession,
    getOrganizationSession,
  );

  const aiContext = useSyncExternalStore(
    subscribeOrganizationStore,
    getOrganizationAiContext,
    getOrganizationAiContext,
  );

  const [bootstrapped, setBootstrapped] = useState(false);

  const refreshAiContext = useCallback(
    (organization: Organization | null, workspace: Workspace | null) => {
      if (!organization || !workspace) {
        setOrganizationAiContext(null);
        return null;
      }
      const context = serviceRef.current.buildAiContext(organization, workspace);
      setOrganizationAiContext(context);
      return context;
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    patchOrganizationSession({ status: "loading", error: null });
    try {
      const preferred = readPreferredWorkspaceId();
      const next = await serviceRef.current.loadSession(preferred);
      setOrganizationSession(next);
      refreshAiContext(next.organization, next.workspace);
      if (next.workspace) {
        persistPreferredWorkspaceId(next.workspace.id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load organization";
      patchOrganizationSession({
        status: "error",
        error: message,
        hydrated: true,
      });
    }
  }, [refreshAiContext]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshSession();
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const createOrganization = useCallback(
    async (input: CreateOrganizationInput) => {
      const result = await serviceRef.current.createOrganization(input);
      persistPreferredWorkspaceId(result.workspace.id);
      await refreshSession();
      return result;
    },
    [refreshSession],
  );

  const updateOrganization = useCallback(
    async (input: UpdateOrganizationInput) => {
      const updated = await serviceRef.current.updateOrganization(input);
      await refreshSession();
      return updated;
    },
    [refreshSession],
  );

  const createWorkspace = useCallback(
    async (input: CreateWorkspaceInput) => {
      const workspace = await serviceRef.current.createWorkspace(input);
      await refreshSession();
      return workspace;
    },
    [refreshSession],
  );

  const switchWorkspace = useCallback(
    async (workspaceId: WorkspaceId) => {
      const selected = selectWorkspaceInStore(workspaceId);
      if (!selected) return false;

      const organization = await serviceRef.current.getOrganization(
        selected.organizationId,
      );
      patchOrganizationSession({
        organization,
        workspace: selected,
        status: "ready",
        error: null,
      });
      refreshAiContext(organization, selected);
      persistPreferredWorkspaceId(workspaceId);
      return true;
    },
    [refreshAiContext],
  );

  const buildAiContext = useCallback(() => {
    const current = getOrganizationSession();
    if (!current.organization || !current.workspace) return null;
    return refreshAiContext(current.organization, current.workspace);
  }, [refreshAiContext]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      session,
      organization: session.organization,
      workspace: session.workspace,
      aiContext,
      isReady: bootstrapped && session.status === "ready",
      isLoading: session.status === "loading" || !bootstrapped,
      createDraft: (partial) => serviceRef.current.createDraft(partial),
      validateDraft: (draft) => serviceRef.current.validateDraft(draft),
      validateProfile: (profile) => serviceRef.current.validateProfile(profile),
      createOrganization,
      updateOrganization,
      createWorkspace,
      switchWorkspace,
      refreshSession,
      buildAiContext,
    }),
    [
      session,
      aiContext,
      bootstrapped,
      createOrganization,
      updateOrganization,
      createWorkspace,
      switchWorkspace,
      refreshSession,
      buildAiContext,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (ctx === null) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
}

/** Test helper — clears in-memory session. */
export function __resetOrganizationProviderStateForTests(): void {
  resetOrganizationStore();
}

export { OrganizationValidationError };
