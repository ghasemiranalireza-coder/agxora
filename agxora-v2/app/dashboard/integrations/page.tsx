"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyUnavailable } from "../../components/workspace/FirstCustomerLegacyUnavailable";

export default function IntegrationsPage(): JSX.Element {
  return (
    <FirstCustomerLegacyUnavailable
      titleKey="dashboard.legacy.integrations.title"
      descriptionKey="dashboard.legacy.integrations.description"
    />
  );
}
