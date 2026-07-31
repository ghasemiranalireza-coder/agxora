"use client";

import { useEffect, type JSX } from "react";
import { useOrganization } from "../../lib/organization";
import { projectStore } from "../../lib/projects";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { ProjectDetailView } from "./ProjectDetailView";
import { ProjectFormDialog } from "./ProjectFormDialog";

const LOCAL_ORG_FALLBACK = "org_local_default";

/**
 * Project detail host — hydrates store then renders tabbed workspace.
 */
export function ProjectDetailWorkspace({
  projectId,
}: {
  readonly projectId: string;
}): JSX.Element {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;

  useEffect(() => {
    void projectStore.hydrate(organizationId).then(() => {
      void projectStore.openProject(projectId);
    });
  }, [organizationId, projectId]);

  return (
    <>
      <ProjectDetailView projectId={projectId} />
      <ProjectFormDialog />
      <ProjectDeleteDialog />
    </>
  );
}
