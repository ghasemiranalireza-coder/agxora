"use client";

import { useMemo, type JSX } from "react";
import type { CalendarItem, CampaignPlan } from "../../lib/creator-studio";
import { formatDate, publishStatusLabel } from "../../lib/creator-studio";
import { catalogCopy, useT } from "../../lib/i18n";
import { Badge, Card, DataTable } from "../ui";
import type { DataTableColumn } from "../ui";

export function CampaignPlanner({
  campaigns,
  calendar,
}: {
  readonly campaigns: readonly CampaignPlan[];
  readonly calendar: readonly CalendarItem[];
}): JSX.Element {
  const t = useT();

  const columns = useMemo<readonly DataTableColumn<CampaignPlan>[]>(
    () => [
      {
        key: "name",
        header: t("creator.campaign.columns.name"),
        render: (row) => (
          <span className="font-medium">
            {catalogCopy(t, `creator.campaigns.${row.id}.name`, row.name)}
          </span>
        ),
      },
      {
        key: "objective",
        header: t("creator.campaign.columns.objective"),
        render: (row) => catalogCopy(t, `creator.campaigns.${row.id}.objective`, row.objective),
      },
      {
        key: "audience",
        header: t("creator.campaign.columns.audience"),
        render: (row) => catalogCopy(t, `creator.campaigns.${row.id}.audience`, row.audience),
      },
      {
        key: "platforms",
        header: t("creator.campaign.columns.platforms"),
        render: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {row.platforms.map((p) => (
              <Badge key={p} tone="accent">
                {p}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        key: "budget",
        header: t("creator.campaign.columns.budget"),
        render: (row) => catalogCopy(t, `creator.campaigns.${row.id}.budget`, row.budgetPlaceholder),
      },
      {
        key: "timeline",
        header: t("creator.campaign.columns.timeline"),
        render: (row) => catalogCopy(t, `creator.campaigns.${row.id}.timeline`, row.timeline),
      },
      {
        key: "status",
        header: t("creator.campaign.columns.status"),
        render: (row) => (
          <Badge>{catalogCopy(t, `creator.campaignStatus.${row.status}`, row.status)}</Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-3" padding="24px">
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.campaign.title")}
        </h3>
        <DataTable
          columns={columns}
          rows={campaigns}
          rowKey={(row) => row.id}
          minWidth={860}
          emptyTitle={t("creator.campaign.emptyTitle")}
          emptyDescription={t("creator.campaign.emptyDescription")}
        />
      </Card>

      <Card className="space-y-3 xl:col-span-2" padding="24px">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.campaign.calendar")}
        </h3>
        <ul className="space-y-2">
          {calendar.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border px-3 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {catalogCopy(t, `creator.calendarItems.${item.id}`, item.title)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {formatDate(item.date)} · {item.platform}
                  </p>
                </div>
                <Badge tone="accent">{t(publishStatusLabel(item.status))}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
