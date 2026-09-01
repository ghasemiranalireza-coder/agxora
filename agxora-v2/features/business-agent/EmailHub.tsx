"use client";

import { useEffect, useState, type JSX } from "react";
import { ModulePanel } from "@/app/components/ModulePanel";
import { useT } from "@/app/lib/i18n";

type CalendarItem = {
  readonly id: string;
  readonly provider: string;
  readonly contentType: string;
  readonly title: string;
  readonly status: string;
  readonly error: string | null;
};

export function EmailHub(): JSX.Element {
  const t = useT();
  const [items, setItems] = useState<readonly CalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/content-calendar", { credentials: "include" })
      .then((r) => r.json())
      .then((body) => {
        if (!body.ok) {
          setError(body.message || t("businessAgent.loadFailed"));
          return;
        }
        setItems(
          (body.items ?? []).filter(
            (item: CalendarItem) =>
              item.provider === "email_gmail" || item.provider === "email_microsoft",
          ),
        );
      })
      .catch(() => setError(t("businessAgent.loadFailed")));
  }, [t]);

  return (
    <ModulePanel
      title={t("businessAgent.emailHubTitle")}
      description={t("businessAgent.emailHubLead")}
    >
      {error ? <p role="alert">{error}</p> : null}
      <p>{t("businessAgent.emailNotClone")}</p>
      {items.length === 0 ? <p>{t("businessAgent.noEmailDrafts")}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.title || t("businessAgent.untitled")} · {item.status}
            {item.error ? ` · ${item.error}` : ""}
          </li>
        ))}
      </ul>
    </ModulePanel>
  );
}
