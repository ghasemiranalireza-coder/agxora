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
  readonly scheduledAt: string | null;
  readonly error: string | null;
};

type Campaign = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly items: readonly CalendarItem[];
};

export function SocialHub(): JSX.Element {
  const t = useT();
  const [campaigns, setCampaigns] = useState<readonly Campaign[]>([]);
  const [items, setItems] = useState<readonly CalendarItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/campaigns", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/content-calendar", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([campaignRes, calendarRes]) => {
        if (!campaignRes.ok || !calendarRes.ok) {
          setError(campaignRes.message || calendarRes.message || t("businessAgent.loadFailed"));
          return;
        }
        setCampaigns(campaignRes.campaigns ?? []);
        setItems(
          (calendarRes.items ?? []).filter(
            (item: CalendarItem) => item.provider !== "email_gmail" && item.provider !== "email_microsoft",
          ),
        );
      })
      .catch(() => setError(t("businessAgent.loadFailed")));
  }, [t]);

  return (
    <ModulePanel
      title={t("businessAgent.socialHubTitle")}
      description={t("businessAgent.socialHubLead")}
    >
      {error ? <p role="alert">{error}</p> : null}
      <h3>{t("businessAgent.campaigns")}</h3>
      {campaigns.length === 0 ? <p>{t("businessAgent.noCampaigns")}</p> : null}
      <ul>
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            {campaign.name} · {campaign.status} · {campaign.items.length} {t("businessAgent.items")}
          </li>
        ))}
      </ul>
      <h3>{t("businessAgent.calendar")}</h3>
      {items.length === 0 ? <p>{t("businessAgent.noCalendar")}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.provider} · {item.contentType} · {item.title || t("businessAgent.untitled")} · {item.status}
            {item.scheduledAt ? ` · ${item.scheduledAt}` : ""}
            {item.error ? ` · ${item.error}` : ""}
          </li>
        ))}
      </ul>
    </ModulePanel>
  );
}
