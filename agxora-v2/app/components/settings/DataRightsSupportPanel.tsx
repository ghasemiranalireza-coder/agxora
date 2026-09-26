"use client";

import { useEffect, useState, type JSX } from "react";
import { Button } from "../ui";
import { COMPANY } from "../../lib/company";
import { useT } from "../../lib/i18n";
/**
 * Honest support and retention panel. No ticket queue and no backup claim.
 * Organization id comes from the server session via /api/v1/auth/me.
 */
export function DataRightsSupportPanel(): JSX.Element {
  const t = useT();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [executionId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("executionId")?.trim() ?? "";
  });

  useEffect(() => {
    void fetch("/api/v1/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((body: { organizationId?: string | null }) => {
        setOrganizationId(body.organizationId ?? null);
      })
      .catch(() => setOrganizationId(null));
  }, []);

  const support = COMPANY.email.support;
  const subject = encodeURIComponent("AGXORA support");
  const body = encodeURIComponent(
    `Organization: ${organizationId ?? ""}\nExecution: ${executionId}`,
  );

  return (
    <section className="space-y-3" data-testid="data-rights-support">
      <div className="space-y-2 text-sm">
        <strong>{t("settings.dataRights.supportTitle")}</strong>
        <p>{t("settings.dataRights.supportBody")}</p>
        <p>
          {t("settings.dataRights.organizationId")}: {organizationId ?? t("settings.dataRights.unavailable")}
        </p>
        <p>
          {t("settings.dataRights.executionId")}: {executionId || t("settings.dataRights.executionHint")}
        </p>
        <p>
          <a href={`mailto:${support}?subject=${subject}&body=${body}`}>{support}</a>
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <strong>{t("settings.dataRights.retentionTitle")}</strong>
        <p>{t("settings.dataRights.deletable")}</p>
        <p>{t("settings.dataRights.retained")}</p>
        <p>{t("settings.dataRights.financeBlock")}</p>
        <p>{t("settings.dataRights.backupUnknown")}</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          window.location.assign("/api/v1/data-export");
        }}
      >
        {t("settings.dataRights.export")}
      </Button>
    </section>
  );
}
