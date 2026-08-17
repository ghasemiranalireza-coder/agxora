"use client";

import Link from "next/link";
import type { JSX, KeyboardEvent } from "react";
import type { CommercialPlan, CommercialPlanId } from "../types";
import { useT, useFormatters } from "@/app/lib/i18n";
import "./billing-plans.css";

export function BillingPlanCard({
  plan,
  current,
  busy,
  selecting,
  onSelect,
}: {
  readonly plan: CommercialPlan;
  readonly current: boolean;
  readonly busy: boolean;
  readonly selecting: boolean;
  readonly onSelect: (planId: CommercialPlanId) => void;
}): JSX.Element {
  const t = useT();
  const { number } = useFormatters();
  const planName = t(`pricing.plans.${plan.id}.name`);
  const planDescription = t(`pricing.plans.${plan.id}.description`);
  const isEnterprise = plan.priceMonthlyUsd == null;
  const recommended = Boolean(plan.highlighted);
  const stateClass = [
    "saas-plan-card",
    current ? "is-current" : "",
    recommended ? "is-recommended" : "",
    selecting ? "is-selecting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const badge = current ? (
    <span className="saas-plan-card__badge">{t("billing.planCard.currentPlan")}</span>
  ) : recommended ? (
    <span className="saas-plan-card__badge saas-plan-card__badge--recommended">
      {t("billing.planCard.recommended")}
    </span>
  ) : (
    <span className="saas-plan-card__badge saas-plan-card__badge--spacer" aria-hidden="true">
      &nbsp;
    </span>
  );

  const body = (
    <>
      {badge}
      <p className="saas-plan-card__name">{planName}</p>
      <p className="saas-plan-card__desc">{planDescription}</p>
      <p className="saas-plan-card__price">
        {isEnterprise
          ? t("billing.planCard.contactSales")
          : t("billing.planCard.pricePerMonth", { price: plan.priceMonthlyUsd ?? 0 })}
      </p>
      <ul className="saas-plan-card__limits">
        <li>{t("billing.planCard.users", { count: plan.limits.users })}</li>
        <li>
          {t("billing.planCard.aiRequests", {
            count: number(plan.limits.aiRequestsPerMonth),
          })}
        </li>
        <li>
          {t("billing.planCard.storage", {
            count: number(plan.limits.storageMb),
          })}
        </li>
        <li>{t("billing.planCard.moduleFeatures", { count: plan.features.length })}</li>
      </ul>
      <span className="saas-plan-card__action" aria-hidden="true">
        {current
          ? t("billing.planCard.currentPlan")
          : isEnterprise
            ? t("billing.planCard.contactSales")
            : selecting
              ? t("billing.planCard.processing")
              : t("billing.planCard.choosePlan")}
      </span>
    </>
  );

  if (current) {
    return (
      <article
        className={stateClass}
        aria-current="true"
        aria-label={t("billing.planCard.currentPlanAria", { name: planName })}
      >
        {body}
      </article>
    );
  }

  if (isEnterprise) {
    return (
      <Link
        href="/contact-sales"
        className={stateClass}
        aria-label={t("billing.planCard.contactSalesAria", { name: planName })}
      >
        {body}
      </Link>
    );
  }

  const disabled = busy;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (!disabled) onSelect(plan.id);
  };

  return (
    <button
      type="button"
      className={stateClass}
      disabled={disabled}
      aria-busy={selecting || undefined}
      aria-label={t("billing.planCard.choosePlanAria", { name: planName })}
      onClick={() => onSelect(plan.id)}
      onKeyDown={onKeyDown}
    >
      {body}
    </button>
  );
}
