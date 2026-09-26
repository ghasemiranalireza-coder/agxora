"use client";

import Link from "next/link";
import { useState, type JSX } from "react";
import {
  COMMERCIAL_PLANS,
  VAT_NOTICE,
  formatNetEur,
  priceCents,
  type BillingInterval,
} from "@/app/lib/billing/catalog";
import { LanguageSwitcher, useLocale } from "../../lib/i18n";
import "./pricing.css";

export function PricingPageView(): JSX.Element {
  const { t } = useLocale();
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <div className="p35-pricing">
      <header className="p35-pricing__header">
        <Link href="/" className="p35-pricing__brand">
          AGXORA
        </Link>
        <nav className="p35-pricing__nav" aria-label={t("pricing.navLabel")}>
          <Link href="/pricing" aria-current="page">
            {t("pricing.navPricing")}
          </Link>
          <Link href="/contact-sales">{t("pricing.navContactSales")}</Link>
          <Link href="/demo">{t("pricing.navBookDemo")}</Link>
          <Link href="/login">{t("pricing.navSignIn")}</Link>
          <LanguageSwitcher id="pricing-language" />
          <Link href="/register" className="p35-pricing__nav-cta">
            {t("pricing.choosePlan")}
          </Link>
        </nav>
      </header>

      <main className="p35-pricing__main">
        <div className="p35-pricing__intro">
          <p className="p35-pricing__eyebrow">{t("pricing.eyebrow")}</p>
          <h1 className="p35-pricing__title">{t("pricing.title")}</h1>
          <p className="p35-pricing__lead">{t("pricing.paidLead")}</p>
          <p className="p35-pricing__vat">{VAT_NOTICE}</p>

          <div className="p35-pricing__toggle" role="group" aria-label={t("pricing.billingInterval")}>
            <button
              type="button"
              className={interval === "month" ? "is-active" : undefined}
              aria-pressed={interval === "month"}
              onClick={() => setInterval("month")}
            >
              {t("pricing.monthly")}
            </button>
            <button
              type="button"
              className={interval === "year" ? "is-active" : undefined}
              aria-pressed={interval === "year"}
              onClick={() => setInterval("year")}
            >
              {t("pricing.yearly")}
            </button>
          </div>
        </div>

        <div className="p35-pricing__grid">
          {COMMERCIAL_PLANS.map((plan) => {
            const amount = formatNetEur(priceCents(plan, interval));
            const suffix = interval === "year" ? t("pricing.perYear") : t("pricing.perMonth");
            return (
              <Link
                key={plan.code}
                href="/register"
                className={`p35-plan${plan.recommended ? " is-recommended" : ""}`}
                aria-label={`${plan.name} — ${t("pricing.choosePlan")}`}
              >
                {plan.recommended ? (
                  <p className="p35-plan__badge">{t("pricing.mostPopular")}</p>
                ) : (
                  <p className="p35-plan__badge p35-plan__badge--spacer" aria-hidden="true">
                    &nbsp;
                  </p>
                )}
                <h2 className="p35-plan__name">{plan.name}</h2>
                <p className="p35-plan__desc">{plan.description}</p>
                <p className="p35-plan__price">
                  <span className="p35-plan__amount">{amount}</span>
                  <span className="p35-plan__suffix">{suffix}</span>
                </p>
                <p className="p35-plan__yearly-hint">{VAT_NOTICE}</p>
                <ul className="p35-plan__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <span className="p35-plan__cta">{t("pricing.choosePlan")}</span>
              </Link>
            );
          })}
        </div>

        <div className="p35-pricing__actions" aria-label={t("pricing.commercialActions")}>
          <Link href="/register" className="p35-pricing__action p35-pricing__action--primary">
            {t("pricing.choosePlan")}
          </Link>
          <Link href="/demo" className="p35-pricing__action">
            {t("pricing.bookDemo")}
          </Link>
          <Link href="/contact-sales" className="p35-pricing__action">
            {t("pricing.contactSales")}
          </Link>
        </div>

        <nav className="p35-pricing__legal" aria-label={t("pricing.legal")}>
          <Link href="/privacy">{t("common.privacy")}</Link>
          <Link href="/terms">{t("common.terms")}</Link>
          <Link href="/cookies">{t("common.cookies")}</Link>
          <Link href="/imprint">{t("common.imprint")}</Link>
          <Link href="/contact">{t("common.contact")}</Link>
        </nav>
      </main>
    </div>
  );
}
