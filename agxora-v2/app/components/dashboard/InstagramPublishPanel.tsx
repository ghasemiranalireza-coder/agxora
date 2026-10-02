"use client";

import { useEffect, useState, type JSX } from "react";
import { Button } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";

interface InstagramView {
  readonly status: string;
  readonly username: string | null;
  readonly caption: string | null;
  readonly mediaId: string | null;
  readonly permalink: string | null;
  readonly message: string | null;
}

export function InstagramPublishPanel(props: {
  readonly goalId: string;
  readonly planId: string;
  readonly day: number;
}): JSX.Element {
  const t = useT();
  const [view, setView] = useState<InstagramView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/agents/marketing/instagram/preview", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goalId: props.goalId, planId: props.planId, day: props.day }),
    })
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; instagram?: InstagramView; error?: string };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.instagram) {
          setError(body.error || t("dashboard.firstResult.instagram.loadFailed"));
          return;
        }
        setView(body.instagram);
      })
      .catch(() => {
        if (!cancelled) setError(t("dashboard.firstResult.instagram.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [props.day, props.goalId, props.planId, t]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/agents/social/instagram/connect", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          permissions: ["connect_account", "read_content", "publish_posts"],
          aiContent: false,
          automaticPublishing: false,
          redirectPath: "/dashboard",
        }),
      });
      const body = (await response.json()) as { ok?: boolean; authorizationUrl?: string; error?: string };
      if (!response.ok || !body.ok || !body.authorizationUrl) throw new Error(body.error || t("dashboard.firstResult.instagram.connectFailed"));
      window.location.assign(body.authorizationUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("dashboard.firstResult.instagram.connectFailed"));
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/agents/marketing/instagram/publish", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", goalId: props.goalId, planId: props.planId, day: props.day }),
      });
      const body = (await response.json()) as { ok?: boolean; instagram?: InstagramView; error?: string };
      if (!response.ok || !body.ok || !body.instagram) throw new Error(body.error || t("dashboard.firstResult.instagram.publishFailed"));
      setView(body.instagram);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("dashboard.firstResult.instagram.publishFailed"));
    } finally {
      setBusy(false);
    }
  };

  const username = view?.username;
  const published = view?.status === "verified" || view?.status === "published";

  return (
    <section className="agx-ig-publish" data-testid="instagram-publish">
      <h3>{t("dashboard.firstResult.instagram.title")}</h3>
      <p>
        {username
          ? t("dashboard.firstResult.instagram.connected", { account: username })
          : t("dashboard.firstResult.instagram.notConnected")}
      </p>
      {view?.caption ? <p>{view.caption}</p> : null}
      {view?.message ? <p>{view.message}</p> : null}
      {view?.mediaId ? <p>{t("dashboard.firstResult.instagram.media", { id: view.mediaId })}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="agx-ig-publish__actions">
        {!username ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void connect()}>
            {t("dashboard.firstResult.instagram.connect")}
          </Button>
        ) : null}
        {username && !published && view?.status !== "ambiguous" ? (
          <Button size="sm" variant="primary" disabled={busy || view?.status === "blocked"} onClick={() => void publish()}>
            {t("dashboard.firstResult.instagram.publish")}
          </Button>
        ) : null}
        {view?.permalink ? (
          <a href={view.permalink}>{t("dashboard.firstResult.instagram.open")}</a>
        ) : null}
      </div>
    </section>
  );
}
