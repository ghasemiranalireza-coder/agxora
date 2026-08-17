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

function valueOrPending(value: string, pendingLabel: string): string {
  return value.trim() ? value : pendingLabel;
}

export function ImprintPageContent(): JSX.Element {
  const t = useT();
  const pending = t("legal.imprint.pendingConfiguration");

  return (
    <LegalPageShell title={t("legal.imprint.title")} eyebrow={t("legal.imprint.eyebrow")}>
      <p>{t("legal.imprint.intro")}</p>

      <dl className="p39-legal__card">
        <div>
          <dt>{t("legal.imprint.company")}</dt>
          <dd>{COMPANY.legalName}</dd>
        </div>
        <div>
          <dt>{t("legal.imprint.address")}</dt>
          <dd>
            {hasConfiguredAddress() ? formatCompanyAddress() : pending}
          </dd>
        </div>
        <div>
          <dt>{t("legal.imprint.email")}</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a>
          </dd>
        </div>
        <div>
          <dt>{t("legal.imprint.support")}</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
          </dd>
        </div>
        <div>
          <dt>{t("legal.imprint.representedBy")}</dt>
          <dd>{valueOrPending(COMPANY.register.managingDirector, pending)}</dd>
        </div>
        <div>
          <dt>{t("legal.imprint.register")}</dt>
          <dd>
            {COMPANY.register.court || COMPANY.register.number
              ? [COMPANY.register.court, COMPANY.register.number]
                  .filter(Boolean)
                  .join(" · ")
              : pending}
          </dd>
        </div>
        <div>
          <dt>{t("legal.imprint.vatId")}</dt>
          <dd>{valueOrPending(COMPANY.register.vatId, pending)}</dd>
        </div>
      </dl>

      <h2>{t("legal.imprint.responsibleForContent")}</h2>
      <p>
        {t("legal.imprint.responsibleBody", {
          legalName: COMPANY.legalName,
          addressSuffix: hasConfiguredAddress()
            ? `, ${formatCompanyAddress()}`
            : "",
        })}
      </p>

      <h2>{t("legal.imprint.contact")}</h2>
      <p>
        {t("legal.imprint.contactBodyBefore")}{" "}
        <Link href="/contact">{t("legal.shell.nav.contact")}</Link>{" "}
        {t("legal.imprint.contactBodyMiddle")}{" "}
        <Link href="/contact-sales">{t("legal.imprint.contactSales")}</Link>{" "}
        {t("legal.imprint.contactBodyAfter")}
      </p>
    </LegalPageShell>
  );
}
