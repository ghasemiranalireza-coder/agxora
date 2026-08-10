"use client";

import Link from "next/link";
import { useState, type JSX } from "react";
import {
  formatPlanPrice,
  listMarketingPlans,
  yearlySavingsPercent,
} from "../../../features/saas";
import type { BillingInterval } from "../../../features/saas";
import "./pricing.css";

export function PricingPageView(): JSX.Element {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const plans = listMarketingPlans();

  return (
    <div className="p35-pricing">
      <header className="p35-pricing__header">
        <Link href="/" className="p35-pricing__brand">
          AGXORA
        </Link>
        <nav className="p35-pricing__nav" aria-label="Pricing navigation">
          <Link href="/pricing" aria-current="page">
            Pricing
          </Link>
          <Link href="/contact-sales">Contact Sales</Link>
          <Link href="/demo">Book Demo</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register" className="p35-pricing__nav-cta">
            Start Free
          </Link>
        </nav>
      </header>

      <main className="p35-pricing__main">
        <div className="p35-pricing__intro">
          <p className="p35-pricing__eyebrow">Pricing</p>
          <h1 className="p35-pricing__title">Plans built for operators who ship.</h1>
          <p className="p35-pricing__lead">
            Clear commercial tiers. Start free, scale when ready, or talk to sales for
            enterprise terms.
          </p>

          <div
            className="p35-pricing__toggle"
            role="group"
            aria-label="Billing interval"
          >
            <button
              type="button"
              className={interval === "monthly" ? "is-active" : undefined}
              aria-pressed={interval === "monthly"}
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={interval === "yearly" ? "is-active" : undefined}
              aria-pressed={interval === "yearly"}
              onClick={() => setInterval("yearly")}
            >
              Yearly
              <span className="p35-pricing__save">Save ~20%</span>
            </button>
          </div>
        </div>

        <div className="p35-pricing__grid">
          {plans.map((plan) => {
            const price = formatPlanPrice(plan, interval);
            const savings = yearlySavingsPercent(plan);
            return (
              <Link
                key={plan.id}
                href={plan.cta.href}
                className={`p35-plan${plan.recommended ? " is-recommended" : ""}`}
                aria-label={`${plan.name} plan — ${plan.cta.label}`}
              >
                {plan.recommended ? (
                  <p className="p35-plan__badge">MOST POPULAR</p>
                ) : (
                  <p className="p35-plan__badge p35-plan__badge--spacer" aria-hidden="true">
                    &nbsp;
                  </p>
                )}
                <h2 className="p35-plan__name">{plan.name}</h2>
                <p className="p35-plan__desc">{plan.description}</p>
                <p className="p35-plan__price">
                  <span className="p35-plan__amount">{price.label}</span>
                  <span className="p35-plan__suffix">{price.suffix}</span>
                </p>
                {interval === "yearly" && savings != null ? (
                  <p className="p35-plan__yearly-hint">
                    €{Number(plan.priceYearlyUsd).toFixed(2)}/year · save{" "}
                    {savings}%
                  </p>
                ) : (
                  <p className="p35-plan__yearly-hint p35-plan__yearly-hint--spacer">
                    &nbsp;
                  </p>
                )}
                <ul className="p35-plan__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <span className="p35-plan__cta">{plan.cta.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p35-pricing__actions" aria-label="Commercial actions">
          <Link href="/register" className="p35-pricing__action p35-pricing__action--primary">
            Start Free
          </Link>
          <Link href="/demo" className="p35-pricing__action">
            Book Demo
          </Link>
          <Link href="/contact-sales" className="p35-pricing__action">
            Contact Sales
          </Link>
        </div>

        <nav className="p35-pricing__legal" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/imprint">Imprint</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </main>
    </div>
  );
}
