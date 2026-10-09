"use client";

import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";
import { useT } from "../lib/i18n";

export function DataDeletionPageContent(): JSX.Element {
  const t = useT();

  return (
    <LegalPageShell
      title={t("legal.deletion.title")}
      eyebrow={t("legal.deletion.eyebrow")}
    >
      <p>{t("legal.deletion.intro")}</p>

      <h2>{t("legal.deletion.inProduct")}</h2>
      <p>{t("legal.deletion.inProductBody")}</p>

      <h2>{t("legal.deletion.retained")}</h2>
      <p>{t("legal.deletion.retainedBody")}</p>

      <h2>{t("legal.deletion.exportTitle")}</h2>
      <p>{t("legal.deletion.exportBody")}</p>

      <h2>{t("legal.deletion.request")}</h2>
      <p>
        {t("legal.deletion.requestBefore")}{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.{" "}
        {t("legal.deletion.requestAfter")}
      </p>

      <h2>{t("legal.deletion.connected")}</h2>
      <p>{t("legal.deletion.connectedBody")}</p>

      <h2>{t("legal.deletion.related")}</h2>
      <p>
        <Link href="/privacy">{t("legal.privacy.title")}</Link>
        {" · "}
        <Link href="/terms">{t("legal.terms.title")}</Link>
        {" · "}
        <Link href="/contact">{t("legal.shell.nav.contact")}</Link>
      </p>
    </LegalPageShell>
  );
}
