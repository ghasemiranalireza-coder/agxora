"use client";

import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";
import { useT } from "../lib/i18n";

export function PrivacyPageContent(): JSX.Element {
  const t = useT();

  return (
    <LegalPageShell title={t("legal.privacy.title")} eyebrow={t("legal.privacy.eyebrow")}>
      <p>
        {t("legal.privacy.intro", {
          legalName: COMPANY.legalName,
          siteUrl: COMPANY.siteUrl,
        })}
      </p>

      <h2>{t("legal.privacy.controller")}</h2>
      <p>
        {COMPANY.legalName}
        <br />
        {COMPANY.address.line1}, {COMPANY.address.line2}, {COMPANY.address.country}
        <br />
        Email:{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>
      </p>

      <h2>{t("legal.privacy.dataWeProcess")}</h2>
      <ul>
        <li>{t("legal.privacy.dataAccount")}</li>
        <li>{t("legal.privacy.dataUsage")}</li>
        <li>{t("legal.privacy.dataBilling")}</li>
        <li>{t("legal.privacy.dataSupport")}</li>
      </ul>

      <h2>{t("legal.privacy.purposes")}</h2>
      <p>{t("legal.privacy.purposesBody")}</p>

      <h2>{t("legal.privacy.retention")}</h2>
      <p>{t("legal.privacy.retentionBody")}</p>

      <h2>{t("legal.privacy.sharing")}</h2>
      <p>{t("legal.privacy.sharingBody")}</p>

      <h2>{t("legal.privacy.yourRights")}</h2>
      <p>
        {t("legal.privacy.yourRightsBodyBefore")}{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.
        {" "}
        {t("legal.privacy.yourRightsBodyAfter")}
      </p>

      <h2>{t("legal.privacy.cookies")}</h2>
      <p>
        {t("legal.privacy.cookiesBodyBefore")}{" "}
        <Link href="/cookies">{t("legal.privacy.cookiePolicy")}</Link>{" "}
        {t("legal.privacy.cookiesBodyAfter")}
      </p>

      <h2>{t("legal.privacy.contactSection")}</h2>
      <p>
        {t("legal.privacy.contactBodyBefore")}{" "}
        <Link href="/contact">{t("legal.shell.nav.contact")}</Link>{" "}
        {t("legal.privacy.contactBodyMiddle")}{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.
      </p>
    </LegalPageShell>
  );
}
