"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useOrganization } from "@/app/lib/organization";
import { useOptionalAuth } from "@/app/lib/auth";
import { automationStore } from "../store";
import { computeAutomationAnalytics } from "../analytics";
import { listWorkflowTemplates } from "../templates";
import { TRIGGER_CATALOG } from "../triggers";
import { ACTION_CATALOG } from "../actions";
import { canWorkflow, type AutomationRole } from "../permissions";
import { workflowService } from "../services";
import type { WorkflowDefinition } from "../types";

const LOCAL_ORG = "org_local_default";

export function useAutomationOrganizationId(): string {
  const { organization } = useOrganization();
  return organization?.id ?? LOCAL_ORG;
}

export function useAutomationEngine() {
  const organizationId = useAutomationOrganizationId();
  const auth = useOptionalAuth();
  const { session } = useOrganization();
  const snapshot = useSyncExternalStore(
    (l) => automationStore.subscribe(l),
    () => automationStore.getSnapshot(),
    () => automationStore.getSnapshot(),
  );

  const workflows = useMemo(
    () =>
      snapshot.workflows.filter((w) => w.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const executions = useMemo(
    () =>
      snapshot.executions.filter((e) => e.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const notifications = useMemo(
    () =>
      snapshot.notifications.filter((n) => n.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const analytics = useMemo(
    () => computeAutomationAnalytics(workflows, executions),
    [workflows, executions],
  );

  const role = useMemo((): AutomationRole => {
    const mem = session.memberships.find(
      (m) => m.organizationId === organizationId,
    );
    const raw = (mem?.role ?? "admin").toLowerCase();
    if (
      raw === "owner" ||
      raw === "admin" ||
      raw === "manager" ||
      raw === "member" ||
      raw === "viewer" ||
      raw === "guest"
    ) {
      return raw;
    }
    if (raw === "employee") return "member";
    return "admin";
  }, [session.memberships, organizationId]);

  const permissions = useMemo(
    () => ({
      canRead: canWorkflow(role, "workflow.read"),
      canWrite: canWorkflow(role, "workflow.write"),
      canExecute: canWorkflow(role, "workflow.execute"),
      canAdmin: canWorkflow(role, "workflow.admin"),
    }),
    [role],
  );

  return {
    hydrated: snapshot.hydrated,
    organizationId,
    userId: auth?.userId ?? null,
    workflows,
    executions,
    notifications,
    analytics,
    templates: listWorkflowTemplates(),
    triggers: TRIGGER_CATALOG,
    actions: ACTION_CATALOG,
    settings: workflowService.getSettings(organizationId),
    permissions,
    getWorkflow: (id: string): WorkflowDefinition | undefined =>
      automationStore.getWorkflow(id),
  };
}
