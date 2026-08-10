"use client";

import Link from "next/link";
import { useState, type JSX } from "react";
import {
  formatPlanPrice,
  listMarketingPlans,
  yearlySavingsPercent,
} from "../../../features/saas";
import type { BillingInterval, CommercialPlanId } from "../../../features/saas";
import { LanguageSwitcher, formatCurrency, formatNumber, useLocale } from "../../lib/i18n";
import "./pricing.css";

export function PricingPageView(): JSX.Element {
  const { t, tList, locale } = useLocale();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const plans = listMarketingPlans();

  const planName = (id: CommercialPlanId): string =>
    t(`pricing.plans.${id}.name`);
  const planDescription = (id: CommercialPlanId): string =>
    t(`pricing.plans.${id}.description`);
  const planFeatures = (id: CommercialPlanId): string[] =>
    tList(`pricing.plans.${id}.features`);
  const planCta = (id: CommercialPlanId): string =>
    id === "enterprise" ? t("pricing.contactSales") : t("pricing.startFree");

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
            {t("pricing.startFree")}
          </Link>
        </nav>
      </header>

      <main className="p35-pricing__main">
        <div className="p35-pricing__intro">
          <p className="p35-pricing__eyebrow">{t("pricing.eyebrow")}</p>
          <h1 className="p35-pricing__title">{t("pricing.title")}</h1>
          <p className="p35-pricing__lead">{t("pricing.lead")}</p>

          <div
            className="p35-pricing__toggle"
            role="group"
            aria-label={t("pricing.billingInterval")}
          >
            <button
              type="button"
              className={interval === "monthly" ? "is-active" : undefined}
              aria-pressed={interval === "monthly"}
              onClick={() => setInterval("monthly")}
            >
              {t("pricing.monthly")}
            </button>
            <button
              type="button"
              className={interval === "yearly" ? "is-active" : undefined}
              aria-pressed={interval === "yearly"}
              onClick={() => setInterval("yearly")}
            >
              {t("pricing.yearly")}
              <span className="p35-pricing__save">{t("pricing.savePercent")}</span>
            </button>
          </div>
        </div>

        <div className="p35-pricing__grid">
          {plans.map((plan) => {
            const price = formatPlanPrice(plan, interval, locale);
            const savings = yearlySavingsPercent(plan);
            const name = planName(plan.id);
            const ctaLabel = planCta(plan.id);
            const features = planFeatures(plan.id);
            const amountLabel =
              plan.priceMonthlyUsd == null ? t("pricing.contactSales") : price.label;
            const suffixLabel =
              plan.priceMonthlyUsd == null
                ? ""
                : interval === "yearly"
                  ? t("pricing.perMonthYearly")
                  : t("pricing.perMonth");

            return (
              <Link
                key={plan.id}
                href={plan.cta.href}
                className={`p35-plan${plan.recommended ? " is-recommended" : ""}`}
                aria-label={t("pricing.planAria", { name, cta: ctaLabel })}
              >
                {plan.recommended ? (
                  <p className="p35-plan__badge">{t("pricing.mostPopular")}</p>
                ) : (
                  <p className="p35-plan__badge p35-plan__badge--spacer" aria-hidden="true">
                    &nbsp;
                  </p>
                )}
                <h2 className="p35-plan__name">{name}</h2>
                <p className="p35-plan__desc">{planDescription(plan.id)}</p>
                <p className="p35-plan__price">
                  <span className="p35-plan__amount">{amountLabel}</span>
                  <span className="p35-plan__suffix">{suffixLabel}</span>
                </p>
                {interval === "yearly" && savings != null && plan.priceYearlyUsd != null ? (
                  <p className="p35-plan__yearly-hint">
                    {t("pricing.yearlyHint", {
                      amount: formatCurrency(Number(plan.priceYearlyUsd), locale, "EUR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                      percent: formatNumber(savings, locale, { maximumFractionDigits: 0 }),
                    })}
                  </p>
                ) : (
                  <p className="p35-plan__yearly-hint p35-plan__yearly-hint--spacer">
                    &nbsp;
                  </p>
                )}
                <ul className="p35-plan__features">
                  {(features.length > 0 ? features : plan.features).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <span className="p35-plan__cta">{ctaLabel}</span>
              </Link>
            );
          })}
        </div>

        <div className="p35-pricing__actions" aria-label={t("pricing.commercialActions")}>
          <Link href="/register" className="p35-pricing__action p35-pricing__action--primary">
            {t("pricing.startFree")}
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
