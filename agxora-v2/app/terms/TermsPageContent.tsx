"use client";

import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";
import { useT } from "../lib/i18n";

export function TermsPageContent(): JSX.Element {
  const t = useT();

  return (
    <LegalPageShell title={t("legal.terms.title")} eyebrow={t("legal.terms.eyebrow")}>
      <p>
        {t("legal.terms.intro", { legalName: COMPANY.legalName })}
      </p>

      <h2>{t("legal.terms.accounts")}</h2>
      <p>{t("legal.terms.accountsBody")}</p>

      <h2>{t("legal.terms.billing")}</h2>
      <p>
        {t("legal.terms.billingBodyBefore")}{" "}
        <Link href="/pricing">{t("legal.terms.pricing")}</Link>
        {t("legal.terms.billingBodyAfter")}
      </p>

      <h2>{t("legal.terms.acceptableUse")}</h2>
      <ul>
        <li>{t("legal.terms.useNoMisuse")}</li>
        <li>{t("legal.terms.useNoUnlawful")}</li>
        <li>{t("legal.terms.useCompliance")}</li>
      </ul>

      <h2>{t("legal.terms.customerData")}</h2>
      <p>
        {t("legal.terms.customerDataBodyBefore")}{" "}
        <Link href="/privacy">{t("legal.terms.privacyPolicy")}</Link>{" "}
        {t("legal.terms.customerDataBodyAfter")}
      </p>

      <h2>{t("legal.terms.aiFeatures")}</h2>
      <p>{t("legal.terms.aiFeaturesBody")}</p>

      <h2>{t("legal.terms.availability")}</h2>
      <p>{t("legal.terms.availabilityBody")}</p>

      <h2>{t("legal.terms.liability")}</h2>
      <p>{t("legal.terms.liabilityBody")}</p>

      <h2>{t("legal.terms.contact")}</h2>
      <p>
        {t("legal.terms.contactBodyBefore")}{" "}
        <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a> ·{" "}
        <Link href="/contact">{t("legal.shell.nav.contact")}</Link> ·{" "}
        <Link href="/imprint">{t("legal.shell.nav.imprint")}</Link>
      </p>
    </LegalPageShell>
  );
}
