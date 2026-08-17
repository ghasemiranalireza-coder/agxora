"use client";

import { useParams } from "next/navigation";
import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";
import { useOrganization } from "../../lib/organization";
import { useT } from "../../lib/i18n";

export default function WorkspacePage(): JSX.Element {
  const t = useT();
  const params = useParams<{ id: string }>();
  const { workspace, organization, session } = useOrganization();
  const match =
    session.accessibleWorkspaces.find((item) => item.id === params.id) ??
    (workspace?.id === params.id ? workspace : null);

  return (
    <AppShell>
      <ModulePanel
        title={t("workspace.page.title")}
        description={t("workspace.page.description")}
      >
        <p style={{ margin: 0, fontSize: 14 }}>
          {t("workspace.idLabel")} <code>{params.id}</code>
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          {t("workspace.active", {
            name: match?.name ?? t("workspace.notInSession"),
          })}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          {t("workspace.organization", {
            name: organization?.name ?? "—",
            slug: organization?.slug ?? "—",
          })}
        </p>
      </ModulePanel>
    </AppShell>
  );
}
