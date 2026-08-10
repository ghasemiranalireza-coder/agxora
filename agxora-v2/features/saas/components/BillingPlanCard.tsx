"use client";

import Link from "next/link";
import type { JSX, KeyboardEvent } from "react";
import type { CommercialPlan, CommercialPlanId } from "../types";
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
    <span className="saas-plan-card__badge">Current plan</span>
  ) : recommended ? (
    <span className="saas-plan-card__badge saas-plan-card__badge--recommended">
      Recommended
    </span>
  ) : (
    <span className="saas-plan-card__badge saas-plan-card__badge--spacer" aria-hidden="true">
      &nbsp;
    </span>
  );

  const body = (
    <>
      {badge}
      <p className="saas-plan-card__name">{plan.name}</p>
      <p className="saas-plan-card__desc">{plan.description}</p>
      <p className="saas-plan-card__price">
        {isEnterprise ? "Contact sales" : `€${plan.priceMonthlyUsd}/mo`}
      </p>
      <ul className="saas-plan-card__limits">
        <li>{plan.limits.users} users</li>
        <li>{plan.limits.aiRequestsPerMonth.toLocaleString()} AI req/mo</li>
        <li>{plan.limits.storageMb.toLocaleString()} MB storage</li>
        <li>{plan.features.length} module features</li>
      </ul>
      <span className="saas-plan-card__action" aria-hidden="true">
        {current
          ? "Current plan"
          : isEnterprise
            ? "Contact sales"
            : selecting
              ? "Processing…"
              : "Choose plan"}
      </span>
    </>
  );

  if (current) {
    return (
      <article className={stateClass} aria-current="true" aria-label={`${plan.name} — current plan`}>
        {body}
      </article>
    );
  }

  if (isEnterprise) {
    return (
      <Link
        href="/contact-sales"
        className={stateClass}
        aria-label={`${plan.name} — contact sales`}
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
      aria-label={`${plan.name} — choose plan`}
      onClick={() => onSelect(plan.id)}
      onKeyDown={onKeyDown}
    >
      {body}
    </button>
  );
}
