"use client";

import type { JSX } from "react";
import { useLocale } from "../../lib/i18n";
import { ModulePanel } from "../../components/ModulePanel";
import { EmptyState } from "../../components/ui";

export default function MemoryPage(): JSX.Element {
  const { t } = useLocale();

  return (
    <ModulePanel
      title={t("dashboard.shell.memory.title")}
      description={t("dashboard.shell.memory.description")}
    >
      <EmptyState
        title={t("dashboard.shell.memory.emptyTitle")}
        description={t("dashboard.shell.memory.emptyBody")}
      />
    </ModulePanel>
  );
}
