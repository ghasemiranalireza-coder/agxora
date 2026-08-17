"use client";

import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";
import { useT } from "../lib/i18n";

export function CookiesPageContent(): JSX.Element {
  const t = useT();

  return (
    <LegalPageShell title={t("legal.cookies.title")} eyebrow={t("legal.cookies.eyebrow")}>
      <p>
        {t("legal.cookies.intro", { companyName: COMPANY.name })}
      </p>

      <h2>{t("legal.cookies.whatAre")}</h2>
      <p>{t("legal.cookies.whatAreBody")}</p>

      <h2>{t("legal.cookies.categories")}</h2>
      <ul>
        <li>
          <strong>{t("legal.cookies.essential")}</strong> — {t("legal.cookies.essentialBody")}
        </li>
        <li>
          <strong>{t("legal.cookies.functional")}</strong> — {t("legal.cookies.functionalBody")}
        </li>
        <li>
          <strong>{t("legal.cookies.analytics")}</strong> — {t("legal.cookies.analyticsBody")}
        </li>
      </ul>

      <h2>{t("legal.cookies.managing")}</h2>
      <p>{t("legal.cookies.managingBody")}</p>

      <h2>{t("legal.cookies.moreInfo")}</h2>
      <p>
        {t("legal.cookies.moreInfoBodyBefore")}{" "}
        <Link href="/privacy">{t("legal.privacy.title")}</Link>{" "}
        {t("legal.cookies.moreInfoBodyMiddle")}{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.
      </p>
    </LegalPageShell>
  );
}
