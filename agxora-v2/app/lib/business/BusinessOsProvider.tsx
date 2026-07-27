"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { agentRegistry } from "../agents";
import {
  aiContextBuilder,
  type AiOperatingContext,
} from "./context/AiContextBuilder";
import {
  businessBrain,
  type ActivateBusinessInput,
  type BusinessProfile,
} from "./brain/BusinessBrain";
import {
  businessTemplateRegistry,
  type BusinessTemplate,
} from "./templates";
import type { BusinessType } from "./BusinessType";
import { pluginRegistry } from "../plugins";
import { rbacEngine } from "../rbac";
import { workflowEngine } from "../workflows";

const PROFILE_STORAGE_KEY = "agxora-business-profile";

export interface BusinessOsContextValue {
  readonly profile: BusinessProfile | null;
  readonly template: BusinessTemplate | null;
  readonly isOnboarded: boolean;
  readonly activateBusiness: (
    input: ActivateBusinessInput & { ownerSubjectId?: string },
  ) => {
    profile: BusinessProfile;
    template: BusinessTemplate;
    context: AiOperatingContext;
  };
  readonly buildAiContext: () => AiOperatingContext | null;
  readonly listTemplates: () => readonly BusinessTemplate[];
  readonly primaryTemplate: (type: BusinessType) => BusinessTemplate;
}

const BusinessOsContext = createContext<BusinessOsContextValue | null>(null);

function readStoredProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BusinessProfile;
  } catch {
    return null;
  }
}

function persistProfile(profile: BusinessProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage failures.
  }
}

function provisionRuntime(
  profile: BusinessProfile,
  template: BusinessTemplate,
  ownerSubjectId = "local-owner",
): void {
  rbacEngine.ensureTemplateRoles(template.defaultRoles);
  rbacEngine.bootstrapOwner(ownerSubjectId, profile.organizationId);
  agentRegistry.activateForOrganization(
    profile.organizationId,
    profile.activatedAgents,
  );
  workflowEngine.registerMany(template.starterWorkflows);
  if (!pluginRegistry.get(`plugin.template.${template.id}`)) {
    pluginRegistry.discover({
      id: `plugin.template.${template.id}`,
      name: `${template.name} Pack`,
      version: template.version,
      description: template.summary,
      slots: ["module", "agent", "workflow"],
      permissions: ["module.read", "agent.execute", "workflow.execute"],
    });
  }
}

interface BusinessOsProviderProps {
  readonly children: ReactNode;
}

export function BusinessOsProvider({
  children,
}: BusinessOsProviderProps): JSX.Element {
  const [profile, setProfile] = useState<BusinessProfile | null>(() =>
    readStoredProfile(),
  );
  const hydratedRef = useRef(false);

  const template = useMemo(() => {
    if (!profile) return null;
    return businessTemplateRegistry.get(profile.templateId) ?? null;
  }, [profile]);

  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    if (!businessBrain.getProfile(profile.organizationId)) {
      businessBrain.activate({
        organizationId: profile.organizationId,
        companyName: profile.companyName,
        businessType: profile.businessType,
        templateId: profile.templateId,
        country: profile.country,
        language: profile.language,
        timezone: profile.timezone,
        goals: profile.goals,
      });
    }
    const activeTemplate =
      businessTemplateRegistry.get(profile.templateId) ??
      businessTemplateRegistry.primaryFor(profile.businessType);
    provisionRuntime(profile, activeTemplate);
  }, [profile]);

  const activateBusiness = useCallback(
    (input: ActivateBusinessInput & { ownerSubjectId?: string }) => {
      const { profile: nextProfile, template: nextTemplate } =
        businessBrain.activate(input);

      provisionRuntime(
        nextProfile,
        nextTemplate,
        input.ownerSubjectId ?? "local-owner",
      );

      persistProfile(nextProfile);
      setProfile(nextProfile);
      hydratedRef.current = true;

      const context = aiContextBuilder.build({ profile: nextProfile });
      return { profile: nextProfile, template: nextTemplate, context };
    },
    [],
  );

  const buildAiContext = useCallback(() => {
    if (!profile) return null;
    return aiContextBuilder.build({ profile });
  }, [profile]);

  const value = useMemo<BusinessOsContextValue>(
    () => ({
      profile,
      template,
      isOnboarded: profile !== null,
      activateBusiness,
      buildAiContext,
      listTemplates: () => businessTemplateRegistry.list(),
      primaryTemplate: (type) => businessTemplateRegistry.primaryFor(type),
    }),
    [profile, template, activateBusiness, buildAiContext],
  );

  return (
    <BusinessOsContext.Provider value={value}>
      {children}
    </BusinessOsContext.Provider>
  );
}

export function useBusinessOs(): BusinessOsContextValue {
  const ctx = useContext(BusinessOsContext);
  if (!ctx) {
    throw new Error("useBusinessOs must be used within BusinessOsProvider");
  }
  return ctx;
}
