"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useLocale } from "../../lib/i18n";
import { Button, EmptyState } from "../ui";
import { FIRST_CUSTOMER_DASHBOARD_HREF } from "../../lib/workspace/firstCustomerSurface";

export function FirstCustomerLegacyUnavailable({
  titleKey,
  descriptionKey,
  actionHref = FIRST_CUSTOMER_DASHBOARD_HREF,
  actionLabelKey = "dashboard.legacy.openDashboard",
}: {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly actionHref?: string;
  readonly actionLabelKey?: string;
}): JSX.Element {
  const { t } = useLocale();
  return (
    <EmptyState
      title={t(titleKey)}
      description={t(descriptionKey)}
      footer={
        <Link href={actionHref} style={{ textDecoration: "none" }}>
          <Button variant="primary">{t(actionLabelKey)}</Button>
        </Link>
      }
    />
  );
}
