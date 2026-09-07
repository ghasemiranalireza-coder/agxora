"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
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
  readonly externalId: string | null;
};

type Campaign = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly items: readonly CalendarItem[];
};

type YoutubeIntegration = {
  readonly connected: boolean;
  readonly permissions: { readonly canPublish: boolean };
};

export function SocialHub(): JSX.Element {
  const t = useT();
  const [campaigns, setCampaigns] = useState<readonly Campaign[]>([]);
  const [items, setItems] = useState<readonly CalendarItem[]>([]);
  const [youtube, setYoutube] = useState<YoutubeIntegration | null>(null);
  const [safeMode, setSafeMode] = useState("SAFE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [campaignRes, calendarRes, integrationsRes, policyRes] = await Promise.all([
      fetch("/api/v1/campaigns", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/content-calendar", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/integrations", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/agent-policy", { credentials: "include" }).then((r) => r.json()),
    ]);
    if (!campaignRes.ok || !calendarRes.ok) {
      throw new Error(campaignRes.message || calendarRes.message || t("businessAgent.loadFailed"));
    }
    setCampaigns(campaignRes.campaigns ?? []);
    setItems(
      (calendarRes.items ?? []).filter(
        (item: CalendarItem) => item.provider !== "email_gmail" && item.provider !== "email_microsoft",
      ),
    );
    const youtubeRow = (integrationsRes.integrations ?? []).find(
      (row: { provider: string }) => row.provider === "youtube",
    );
    setYoutube(youtubeRow ?? null);
    setSafeMode(policyRes.policy?.mode ?? "SAFE");
  }, [t]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/campaigns", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/content-calendar", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/integrations", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/agent-policy", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([campaignRes, calendarRes, integrationsRes, policyRes]) => {
        if (!campaignRes.ok || !calendarRes.ok) {
          setError(campaignRes.message || calendarRes.message || t("businessAgent.loadFailed"));
          return;
        }
        setCampaigns(campaignRes.campaigns ?? []);
        setItems(
          (calendarRes.items ?? []).filter(
            (item: CalendarItem) =>
              item.provider !== "email_gmail" && item.provider !== "email_microsoft",
          ),
        );
        const youtubeRow = (integrationsRes.integrations ?? []).find(
          (row: { provider: string }) => row.provider === "youtube",
        );
        setYoutube(youtubeRow ?? null);
        setSafeMode(policyRes.policy?.mode ?? "SAFE");
      })
      .catch(() => setError(t("businessAgent.loadFailed")));
  }, [t]);

  async function mutateItem(id: string, action: "approve" | "reject" | "execute") {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(
        action === "execute"
          ? `/api/v1/campaigns/items/${id}/execute`
          : `/api/v1/campaigns/items/${id}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: action === "execute" ? JSON.stringify({ kind: "publish" }) : "{}",
        },
      );
      const body = await response.json();
      if (!body.ok) {
        throw new Error(body.message || t("businessAgent.loadFailed"));
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModulePanel
      title={t("businessAgent.socialHubTitle")}
      description={t("businessAgent.socialHubLead")}
    >
      {error ? <p role="alert">{error}</p> : null}
      <p>{t("businessAgent.youtubePublishSupported")}</p>
      <p>
        {t("businessAgent.autonomyMode")}: <strong>{safeMode}</strong>
        {safeMode === "SAFE" ? ` · ${t("businessAgent.safeModePublish")}` : ""}
      </p>
      {youtube && !youtube.permissions.canPublish ? (
        <p>{t("businessAgent.publishPermissionOff")}</p>
      ) : null}
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
          <li key={item.id} style={{ marginBottom: 12 }}>
            {item.provider} · {item.contentType} · {item.title || t("businessAgent.untitled")} · {item.status}
            {item.scheduledAt ? ` · ${item.scheduledAt}` : ""}
            {item.error ? ` · ${item.error}` : ""}
            {item.externalId ? ` · YouTube ${item.externalId}` : ""}
            {item.provider !== "youtube" ? ` · ${t("businessAgent.providerUnavailable")}` : ""}
            <div>
              {item.provider === "youtube" && item.status === "NEEDS_APPROVAL" ? (
                <>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => void mutateItem(item.id, "approve")}
                  >
                    {t("businessAgent.approvePublish")}
                  </button>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => void mutateItem(item.id, "reject")}
                  >
                    {t("businessAgent.rejectPublish")}
                  </button>
                </>
              ) : null}
              {item.provider === "youtube" && item.status === "APPROVED" ? (
                <button
                  type="button"
                  disabled={busy === item.id || !youtube?.permissions.canPublish}
                  onClick={() => void mutateItem(item.id, "execute")}
                >
                  {t("businessAgent.publishApproved")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </ModulePanel>
  );
}
