"use client";

import type { JSX } from "react";
import Link from "next/link";
import { COMPANY } from "../../lib/company";
import { useLocale } from "../../lib/i18n";

export function LandingFooter(): JSX.Element {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="p31-footer">
      <div className="p31-wrap p31-footer__row">
        <strong className="p31-wordmark">AGXORA</strong>
        <nav aria-label={t("landing.footer.ariaNav")}>
          <Link href="#product">{t("landing.footer.product")}</Link>
          <Link href="#platform">{t("landing.footer.platform")}</Link>
          <Link href="/pricing">{t("landing.footer.pricing")}</Link>
          <Link href="/login">{t("landing.footer.signIn")}</Link>
          <Link href="/register">{t("landing.footer.startFree")}</Link>
          <Link href="/demo">{t("landing.footer.bookDemo")}</Link>
          <Link href="/contact">{t("landing.footer.contact")}</Link>
          <Link href="/contact-sales">{t("landing.footer.contactSales")}</Link>
        </nav>
        <p>
          {t("landing.footer.copyright", {
            year,
            company: COMPANY.name,
          })}
        </p>
      </div>
      <div className="p31-wrap p31-footer__legal">
        <nav aria-label={t("landing.footer.ariaLegal")}>
          <Link href="/privacy">{t("landing.footer.privacy")}</Link>
          <Link href="/terms">{t("landing.footer.terms")}</Link>
          <Link href="/cookies">{t("landing.footer.cookies")}</Link>
          <Link href="/imprint">{t("landing.footer.imprint")}</Link>
        </nav>
        <p>
          <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a>
          {" · "}
          <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
        </p>
      </div>
    </footer>
  );
}
