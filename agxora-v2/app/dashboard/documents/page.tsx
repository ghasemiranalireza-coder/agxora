"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyUnavailable } from "../../components/workspace/FirstCustomerLegacyUnavailable";
import { FIRST_CUSTOMER_CUSTOMER_HREF } from "../../lib/workspace/firstCustomerSurface";

export default function DocumentsPage(): JSX.Element {
  return (
    <FirstCustomerLegacyUnavailable
      titleKey="dashboard.legacy.documents.title"
      descriptionKey="dashboard.legacy.documents.description"
      actionHref={FIRST_CUSTOMER_CUSTOMER_HREF}
      actionLabelKey="dashboard.legacy.openCrm"
    />
  );
}
