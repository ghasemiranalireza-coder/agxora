"use client";

import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import {
  COMPANY,
  formatCompanyAddress,
  hasConfiguredAddress,
} from "../lib/company";
import { useT } from "../lib/i18n";

export function ContactPageContent(): JSX.Element {
  const t = useT();

  return (
    <LegalPageShell title={t("legal.contact.title")} eyebrow={t("legal.contact.eyebrow")}>
      <p>
        {t("legal.contact.introLead")}{" "}
        <Link href="/contact-sales">{t("legal.contact.contactSales")}</Link>.
      </p>

      <dl className="p39-legal__card">
        <div>
          <dt>{t("legal.contact.companyEmail")}</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a>
          </dd>
        </div>
        <div>
          <dt>{t("legal.contact.supportEmail")}</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
          </dd>
        </div>
        <div>
          <dt>{t("legal.contact.sales")}</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.sales}`}>{COMPANY.email.sales}</a>
            {" · "}
            <Link href="/contact-sales">{t("legal.contact.enterpriseForm")}</Link>
          </dd>
        </div>
        <div>
          <dt>{t("legal.contact.businessAddress")}</dt>
          <dd>
            {COMPANY.legalName}
            <br />
            {hasConfiguredAddress()
              ? formatCompanyAddress()
              : t("legal.contact.addressPending")}
          </dd>
        </div>
      </dl>

      <h2>{t("legal.contact.quickLinks")}</h2>
      <ul>
        <li>
          <Link href="/pricing">{t("legal.contact.pricing")}</Link>
        </li>
        <li>
          <Link href="/contact-sales">{t("legal.contact.contactSales")}</Link>
        </li>
        <li>
          <Link href="/imprint">{t("legal.contact.imprint")}</Link>
        </li>
        <li>
          <Link href="/privacy">{t("legal.contact.privacyPolicy")}</Link>
        </li>
      </ul>
    </LegalPageShell>
  );
}
