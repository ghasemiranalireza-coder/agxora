"use client";

import type { JSX } from "react";
import { AgentCommandPanel } from "../../../features/business-agent/AgentCommandPanel";
import { Card } from "../ui/Card";
import { useT } from "../../lib/i18n";

export function CommandCenter(): JSX.Element {
  const t = useT();

  return (
    <section
      id="agx-command-center"
      className="agx-command-center"
      aria-labelledby="agx-command-center-title"
    >
      <Card hover={false} className="agx-command-center__card">
        <p className="agx-command-center__eyebrow">{t("dashboard.command.eyebrow")}</p>
        <h2 id="agx-command-center-title" className="agx-command-center__title">
          {t("dashboard.command.askToday")}
        </h2>
        <p className="agx-command-center__lead">{t("dashboard.command.lead")}</p>
        <AgentCommandPanel compact />
      </Card>
    </section>
  );
}
