"use client";

import { useParams } from "next/navigation";
import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";
import { useOrganization } from "../../lib/organization";

export default function WorkspacePage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { workspace, organization, session } = useOrganization();
  const match =
    session.accessibleWorkspaces.find((item) => item.id === params.id) ??
    (workspace?.id === params.id ? workspace : null);

  return (
    <AppShell>
      <ModulePanel
        title="Workspace"
        description="Isolated tenant workspace surface for modules and AI."
      >
        <p style={{ margin: 0, fontSize: 14 }}>
          Workspace ID: <code>{params.id}</code>
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          Active: {match?.name ?? "Not in current session"}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          Organization: {organization?.name ?? "—"} ({organization?.slug ?? "—"})
        </p>
      </ModulePanel>
    </AppShell>
  );
}
