"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { ModulePanel } from "@/app/components/ModulePanel";
import { useT } from "@/app/lib/i18n";

type CalendarItem = {
  readonly id: string;
  readonly provider: string;
  readonly contentType: string;
  readonly title: string;
  readonly caption: string;
  readonly body: string;
  readonly status: string;
  readonly error: string | null;
  readonly externalId: string | null;
};

type GmailIntegration = {
  readonly connected: boolean;
  readonly accountLabel: string | null;
  readonly status: string;
  readonly permissions: { readonly canRead: boolean; readonly canCreateDraft: boolean; readonly canSendEmail: boolean };
};

type GmailMessage = {
  readonly id: string;
  readonly subject: string;
  readonly from: string;
  readonly snippet: string;
  readonly date: string;
};

type ExternalEvent = {
  readonly id: string;
  readonly action: string;
  readonly status: string;
  readonly provider: string | null;
  readonly error: string | null;
};

export function EmailHub(): JSX.Element {
  const t = useT();
  const [items, setItems] = useState<readonly CalendarItem[]>([]);
  const [gmail, setGmail] = useState<GmailIntegration | null>(null);
  const [safeMode, setSafeMode] = useState("SAFE");
  const [messages, setMessages] = useState<readonly GmailMessage[]>([]);
  const [events, setEvents] = useState<readonly ExternalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draftTo, setDraftTo] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const reload = useCallback(async () => {
    const [calendarRes, integrationsRes, policyRes, actionsRes] = await Promise.all([
      fetch("/api/v1/content-calendar", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/integrations", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/agent-policy", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/external-actions", { credentials: "include" }).then((r) => r.json()),
    ]);
    if (!calendarRes.ok) {
      throw new Error(calendarRes.message || t("businessAgent.loadFailed"));
    }
    setItems(
      (calendarRes.items ?? []).filter(
        (item: CalendarItem) =>
          item.provider === "email_gmail" || item.provider === "email_microsoft",
      ),
    );
    const gmailRow = (integrationsRes.integrations ?? []).find(
      (row: { provider: string }) => row.provider === "email_gmail",
    );
    setGmail(gmailRow ?? null);
    setSafeMode(policyRes.policy?.mode ?? "SAFE");
    setEvents(
      (actionsRes.events ?? []).filter(
        (event: ExternalEvent) =>
          event.provider === "email_gmail" ||
          String(event.action).startsWith("gmail."),
      ),
    );
  }, [t]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/content-calendar", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/integrations", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/agent-policy", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/external-actions", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([calendarRes, integrationsRes, policyRes, actionsRes]) => {
        if (!calendarRes.ok) {
          setError(calendarRes.message || t("businessAgent.loadFailed"));
          return;
        }
        setItems(
          (calendarRes.items ?? []).filter(
            (item: CalendarItem) =>
              item.provider === "email_gmail" || item.provider === "email_microsoft",
          ),
        );
        const gmailRow = (integrationsRes.integrations ?? []).find(
          (row: { provider: string }) => row.provider === "email_gmail",
        );
        setGmail(gmailRow ?? null);
        setSafeMode(policyRes.policy?.mode ?? "SAFE");
        setEvents(
          (actionsRes.events ?? []).filter(
            (event: ExternalEvent) =>
              event.provider === "email_gmail" ||
              String(event.action).startsWith("gmail."),
          ),
        );
      })
      .catch(() => setError(t("businessAgent.loadFailed")));
  }, [t]);

  async function loadMessages() {
    setBusy("messages");
    setError(null);
    try {
      const response = await fetch(
        "/api/v1/integrations/email_gmail/messages?q=newer_than:1d&maxResults=20",
        { credentials: "include" },
      );
      const body = await response.json();
      if (!body.ok) {
        throw new Error(body.message || t("businessAgent.loadFailed"));
      }
      setMessages(body.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function createDraft() {
    setBusy("draft");
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/email_gmail/drafts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draftTo,
          subject: draftSubject,
          body: draftBody,
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        throw new Error(body.message || t("businessAgent.connectFailed"));
      }
      setDraftTo("");
      setDraftSubject("");
      setDraftBody("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.connectFailed"));
    } finally {
      setBusy(null);
    }
  }

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
          body: action === "execute" ? JSON.stringify({ kind: "send_email" }) : "{}",
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
      title={t("businessAgent.emailHubTitle")}
      description={t("businessAgent.emailHubLead")}
    >
      {error ? <p role="alert">{error}</p> : null}
      <p>{t("businessAgent.emailNotClone")}</p>
      <p>
        {t("businessAgent.autonomyMode")}: <strong>{safeMode}</strong>
        {safeMode === "SAFE" ? ` · ${t("businessAgent.safeModeActive")}` : ""}
      </p>
      <p>
        {t("businessAgent.gmailStatus")}:{" "}
        <strong>
          {gmail?.connected
            ? t("businessAgent.connected")
            : t("businessAgent.notConnected")}
        </strong>
        {gmail?.accountLabel ? ` · ${gmail.accountLabel}` : ""}
      </p>
      {gmail?.connected && gmail.permissions.canRead ? (
        <p>
          <button type="button" disabled={busy === "messages"} onClick={() => void loadMessages()}>
            {t("businessAgent.refreshMessages")}
          </button>
        </p>
      ) : null}
      {messages.length === 0 ? <p>{t("businessAgent.noMessages")}</p> : null}
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            {message.subject || t("businessAgent.untitled")} · {message.from} · {message.snippet}
          </li>
        ))}
      </ul>
      {gmail?.connected && gmail.permissions.canCreateDraft ? (
        <fieldset style={{ border: 0, padding: 0, margin: "16px 0" }}>
          <legend>{t("businessAgent.createGmailDraft")}</legend>
          <label>
            To
            <input
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
            />
          </label>
          <label>
            {t("businessAgent.subject")}
            <input
              value={draftSubject}
              onChange={(event) => setDraftSubject(event.target.value)}
              style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
            />
          </label>
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            rows={5}
            style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
          />
          <button
            type="button"
            disabled={busy === "draft" || !draftTo.trim() || !draftSubject.trim()}
            onClick={() => void createDraft()}
          >
            {t("businessAgent.createGmailDraft")}
          </button>
        </fieldset>
      ) : null}
      {items.length === 0 ? <p>{t("businessAgent.noEmailDrafts")}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id} style={{ marginBottom: 12 }}>
            {item.title || t("businessAgent.untitled")} · {item.status}
            {item.caption ? ` · ${item.caption}` : ""}
            {item.error ? ` · ${item.error}` : ""}
            {item.externalId ? ` · Gmail ${item.externalId}` : ""}
            <div>
              {item.provider === "email_gmail" && item.status === "NEEDS_APPROVAL" ? (
                <>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => void mutateItem(item.id, "approve")}
                  >
                    {t("businessAgent.approveSend")}
                  </button>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => void mutateItem(item.id, "reject")}
                  >
                    {t("businessAgent.rejectSend")}
                  </button>
                </>
              ) : null}
              {item.provider === "email_gmail" && item.status === "APPROVED" ? (
                <button
                  type="button"
                  disabled={busy === item.id || !gmail?.permissions.canSendEmail}
                  onClick={() => void mutateItem(item.id, "execute")}
                >
                  {t("businessAgent.sendApproved")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <h3>{t("businessAgent.externalActions")}</h3>
      {events.length === 0 ? <p>{t("businessAgent.noCalendar")}</p> : null}
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {event.action} · {event.status}
            {event.error ? ` · ${event.error}` : ""}
          </li>
        ))}
      </ul>
    </ModulePanel>
  );
}
