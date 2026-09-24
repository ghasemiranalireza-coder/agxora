"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyUnavailable } from "../../components/workspace/FirstCustomerLegacyUnavailable";

export default function AnalyticsPage(): JSX.Element {
  return (
    <FirstCustomerLegacyUnavailable
      titleKey="dashboard.legacy.analytics.title"
      descriptionKey="dashboard.legacy.analytics.description"
    />
  );
}
